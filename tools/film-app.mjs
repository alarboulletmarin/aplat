/* Le film « Huit secondes ».
 *
 * Huit secondes, 1080 sur 1920, trente images par seconde. C'est le film le
 * moins glamour du lot, et le seul qui réponde à « oui, mais concrètement ».
 *
 * L'IDÉE. Entre l'ouverture de l'application et le fichier dans la pellicule,
 * il y a trois gestes. Le film les montre, et rien d'autre.
 *
 * CE FILM NE JOUE PAS L'APPLICATION, IL LA PILOTE. Ce n'est pas une maquette
 * peinte au canevas comme les autres films : c'est le build livré, ouvert dans
 * un vrai navigateur à la taille d'un téléphone, dont on clique les vrais
 * contrôles. L'aperçu qu'on voit est calculé par le moteur du produit, le
 * verdict de lisibilité est celui que la sonde affiche, et le téléchargement
 * de la fin est un vrai téléchargement, dont le film reprend le nom, les
 * dimensions et le poids réels.
 *
 * CE QUI EST AUTHENTIQUE ET CE QUI NE L'EST PAS, puisque la question se pose.
 * Les gestes sont réels : ce sont de vrais clics sur les vrais éléments, et
 * l'application répond comme elle répond. Le RYTHME, lui, est écrit : chaque
 * geste tombe sur une image choisie, au lieu d'être capturé en temps réel. Le
 * doigt à l'écran est un repère ajouté par le film, pas un curseur du produit.
 * En revanche le coût de chaque action est mesuré et publié : si l'application
 * mettait une demi-seconde à se redessiner, le film le dirait.
 *
 * Usage : `npm run build`, puis `node tools/film-app.mjs`.
 */
import fs from 'node:fs'
import path from 'node:path'
import { launch } from './pw.mjs'
import { ouvrir } from './serveur.mjs'
import { encodeurH264, SORTIE, RACINE, IPS, TEMPS } from './pellicule.mjs'

const NOM = 'aplat-film-huit-8s'
const TOTAL = 240
/* Le viewport en pixels CSS, à densité 3 : 360 par 640 donne 1080 par 1920. */
const VUE = { width: 360, height: 640 }

/* Le conducteur. Un geste par temps et demi, trois gestes, une pause pour
   regarder à chaque fois. Les cibles sont des sélecteurs du produit : si
   l'application les renomme, le film s'arrête au lieu de filmer du vide. */
const GESTES = [
  { image: 45, cible: '#onglet-pay' },
  { image: 90, cible: '#liste-familles .opt[data-famille]' },
  { image: 135, cible: '#btn-graine' },
  { image: 180, cible: '#btn-export', telecharge: true },
]

const STYLE = `
  /* Le film fige tout ce qui bougerait de soi-même : deux tournages doivent
     rendre la même image. */
  *, *::before, *::after {
    animation-duration: 0s !important; animation-delay: 0s !important;
    transition-duration: 0s !important; transition-delay: 0s !important;
    caret-color: transparent !important;
  }
  /* Le seul ajout du film à l'écran du produit : un repère de doigt. Pas de
     bandeau d'étape, pas de carton de fin. Le premier jet en avait deux, et le
     bandeau du haut couvrait le logo et la résolution, c'est-à-dire la seule
     marque visible du film. L'application se légende toute seule : « Famille
     de motif », « Lisibilité bonne, 4,6:1 », « Télécharger », « 1080 x 1920
     px ». Ajouter des mots par-dessus, c'était en cacher de meilleurs. */
  #fx-doigt {
    position: fixed; z-index: 2147483647; width: 46px; height: 46px;
    margin: -23px 0 0 -23px; border-radius: 999px; pointer-events: none;
    border: 3px solid #17243F; background: rgba(23, 36, 63, 0.16);
    left: 0; top: 0;
  }
`

const attendre = async (page) => {
  await page.waitForFunction(
    () => !document.querySelector('#btn-export[aria-busy="true"]'),
    null, { timeout: 15000 },
  ).catch(() => {})
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))
}

;(async () => {
  fs.mkdirSync(SORTIE, { recursive: true })
  const { srv, port } = await ouvrir()
  const browser = await launch()
  const ctx = await browser.newContext({
    ...VUE && { viewport: VUE },
    deviceScaleFactor: 3, locale: 'fr-FR', hasTouch: true, isMobile: true,
    colorScheme: 'light', acceptDownloads: true,
  })
  const page = await ctx.newPage()
  const erreurs = []
  page.on('pageerror', (e) => erreurs.push(e.message))

  await page.goto(`http://127.0.0.1:${port}/app?l=fr&m=arcade&p=soleil&d=2&s=1234`,
    { waitUntil: 'networkidle' })
  await page.waitForTimeout(700)
  await page.addStyleTag({ content: STYLE })
  await page.evaluate(() => {
    const e = document.createElement('div'); e.id = 'fx-doigt'
    document.body.appendChild(e)
  })

  /* Les cibles sont relevées sur la page, jamais devinées, et on vérifie
     qu'elles sont VISIBLES et non recouvertes par la barre collante du bas.
     Le premier jet visait des tuiles situées sous cette barre : le clic
     partait bien, l'application répondait bien, mais le doigt pressait un
     endroit où le spectateur ne voyait rien se passer. Un geste qu'on ne voit
     pas est un geste perdu. */
  const cibles = await page.evaluate((gestes) => gestes.map((g) => {
    const e = document.querySelector(g.cible)
    if (!e) return null
    const b = e.getBoundingClientRect()
    const centre = { x: b.x + b.width / 2, y: b.y + b.height / 2 }
    /* Ce que le navigateur trouve réellement sous ce point : si ce n'est pas
       la cible, c'est qu'elle est recouverte. */
    const dessus = document.elementFromPoint(centre.x, centre.y)
    return { ...centre, couvert: !(dessus && (dessus === e || e.contains(dessus))) }
  }), GESTES)
  cibles.forEach((c, k) => {
    if (!c) { console.error(`cible introuvable : ${GESTES[k].cible}`); process.exit(1) }
    if (c.couvert) {
      console.error(`cible recouverte, le geste ne se verrait pas : ${GESTES[k].cible}`)
      process.exit(1)
    }
  })

  const encodeur = encodeurH264(path.join(SORTIE, `${NOM}.mp4`))
  const couts = []
  let telechargement = null
  /* Le doigt entre par le bas du cadre au lieu d'y être déjà posé. */
  const depart = { x: VUE.width / 2, y: VUE.height + 40 }

  const depart_ = Date.now()
  for (let i = 0; i < TOTAL; i += 1) {
    /* Le doigt va d'une cible à la suivante, et il est arrivé au moment du
       geste. Entre deux gestes il ne bouge plus : c'est une main, pas un
       curseur qui vibre. */
    const suivant = GESTES.findIndex((g) => g.image >= i)
    if (suivant >= 0) {
      const g = GESTES[suivant]
      const precedent = suivant === 0 ? { image: 0, p: depart } : { image: GESTES[suivant - 1].image, p: cibles[suivant - 1] }
      const t = Math.max(0, Math.min(1, (i - precedent.image) / Math.max(1, g.image - 20 - precedent.image)))
      const doux = t * t * (3 - 2 * t)
      const x = precedent.p.x + (cibles[suivant].x - precedent.p.x) * doux
      const y = precedent.p.y + (cibles[suivant].y - precedent.p.y) * doux
      const presse = i >= g.image - 2 && i <= g.image + 3
      await page.evaluate(({ x: X, y: Y, presse: P }) => {
        const d = document.getElementById('fx-doigt')
        d.style.left = `${X}px`; d.style.top = `${Y}px`
        d.style.transform = P ? 'scale(0.72)' : 'scale(1)'
        d.style.background = P ? 'rgba(23,36,63,0.42)' : 'rgba(23,36,63,0.16)'
      }, { x, y, presse })
    }

    const geste = GESTES.find((g) => g.image === i)
    if (geste) {
      const t0 = Date.now()
      if (geste.telecharge) {
        const [dl] = await Promise.all([
          page.waitForEvent('download', { timeout: 30000 }),
          page.$eval(geste.cible, (e) => e.click()),
        ])
        const chemin = path.join(SORTIE, dl.suggestedFilename())
        await dl.saveAs(chemin)
        telechargement = {
          nom: dl.suggestedFilename(),
          poids: fs.statSync(chemin).size,
        }
        fs.unlinkSync(chemin)
      } else {
        await page.$eval(geste.cible, (e) => e.click())
      }
      await attendre(page)
      couts.push({ geste: geste.cible, ms: Date.now() - t0 })
    }

    await encodeur.ecrire(await page.screenshot({
      type: 'jpeg', quality: 96,
      clip: { x: 0, y: 0, width: VUE.width, height: VUE.height },
    }))
    if (i % 30 === 0) process.stdout.write(`\r  ${Math.round((i / TOTAL) * 100)} %   `)
  }
  await encodeur.finir()
  await browser.close()
  srv.close()

  if (erreurs.length) console.log('\nerreurs de page :', erreurs.join(' | '))
  console.log(`\ncoût réel de chaque geste, mesuré : ` +
    couts.map((c) => `${c.geste.replace(/#|\[.*|\.opt.*/g, '') || 'famille'} ${c.ms} ms`).join(', '))
  console.log(`fichier réellement téléchargé : ${telechargement.nom}, ` +
    `${Math.round(telechargement.poids / 1024)} ko`)

  fs.writeFileSync(path.join(SORTIE, `${NOM}.json`), JSON.stringify({
    ips: IPS, total: TOTAL, imagesParTemps: TEMPS,
    montages: [{ nom: NOM, segments: [[0, TOTAL]] }],
    gestes: GESTES.map((g, k) => ({ ...g, ms: couts[k]?.ms })),
    telechargement,
    /* La partition. Un clic, un clic : chaque geste a son coup, et rien ne
       joue entre eux sauf la pulsation. Le film est court, la musique n'a pas
       le temps de raconter quoi que ce soit. */
    partition: [
      ...Array.from({ length: TOTAL / TEMPS }, (_, k) => ({
        son: 'battement', image: k * TEMPS, force: k % 2 === 0 ? 1 : 0.58,
      })),
      ...GESTES.slice(0, 3).map((g, k) => ({
        son: 'clic', image: g.image, hauteur: [1760, 1568, 1318][k], force: 1.1,
      })),
      { son: 'tenue', image: 0, hauteur: 110, duree: 200 / IPS, force: 0.7 },
      { son: 'accord', image: 180, hauteurs: [110, 164.81, 220, 329.63], duree: 2, force: 1.15 },
      { son: 'tenue', image: 180, hauteur: 55, duree: (TOTAL - 180) / IPS, force: 0.9 },
    ],
  }, null, 2) + '\n')
  console.log(`${path.relative(RACINE, path.join(SORTIE, `${NOM}.mp4`))} : ` +
    `${TOTAL} images, ${(TOTAL / IPS).toFixed(0)} s, ` +
    `${(fs.statSync(path.join(SORTIE, `${NOM}.mp4`)).size / 1048576).toFixed(1)} Mo, ` +
    `en ${Math.round((Date.now() - depart_) / 1000)} s`)
})()
