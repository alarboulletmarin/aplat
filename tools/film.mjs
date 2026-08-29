/* Le film des réseaux : une story ou un reel de vingt secondes.
 *
 * 1080 sur 1920, trente images par seconde, muet. Le son se pose dans
 * l'application de publication, qui propose son catalogue de musique : un
 * fichier livré avec une bande-son ne passerait pas leurs droits.
 *
 * Pourquoi pas Remotion. Le dépôt sait déjà peindre le produit : Playwright
 * ouvre la page, le banc y pose le moteur, et la feuille de style est celle
 * qui est livrée. Un second moteur de rendu voudrait dire une seconde copie
 * des cartes, une seconde copie des jetons, et deux vérités à tenir
 * ensemble. Ici, chaque image du film sort du produit, comme chaque image
 * des cartes.
 *
 * Rien ne bouge tout seul. Il n'y a ni transition CSS ni animation : `etat(i)`
 * calcule ce qu'il faut voir à l'image `i`, et la même image rend deux fois
 * le même pixel. Le film ne court donc pas après une horloge, il s'encode
 * image par image, et deux exports sont le même fichier.
 *
 * Usage : npm run build, puis `node tools/film.mjs [adresse]`.
 * `CHROMIUM_EXE` désigne un Chromium déjà présent, `FFMPEG_EXE` un encodeur
 * H.264. Sans le second, l'outil dit ce qui manque plutôt que de produire un
 * fichier qu'Instagram refuserait.
 */
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { launch } from './pw.mjs'
import { poser } from './banc.mjs'
import { ouvrir } from './serveur.mjs'

const ICI = fileURLToPath(new URL('.', import.meta.url))
const RACINE = path.resolve(ICI, '..')
const SORTIE = path.resolve(RACINE, '.social')

const ARGS = process.argv.slice(2)
const ADRESSE = ARGS.find((a) => !a.startsWith('--')) || 'aplat.vercel.app'
/* Une story coupe à quinze secondes et publie le reste en deuxième carte ;
   un reel prend les vingt. Deux montages, donc, et non un fichier rogné :
   c'est le plan du milieu qui rend les cinq secondes, parce qu'il bat deux
   fois moins souvent qu'on ne le croit nécessaire. */
const COURT = ARGS.includes('--story')

const LARGEUR = 1080
const HAUTEUR = 1920
const IPS = 30

/* Le montage est calé sur 120 battements par minute : quinze images par
   temps, soixante par mesure. Tout ce qui apparaît, tout ce qui coupe, tombe
   sur cette grille. N'importe quelle musique à 120 se pose dessus sans qu'on
   recoupe quoi que ce soit, et c'est ce qui fait qu'un film paraît monté
   plutôt que déroulé. */
const TEMPS = 15

/* Les trois plans, en secondes. Vingt en tout : au-dessus, une story se
   coupe en deux ; en dessous, le voile n'a pas le temps de se démontrer. */
/* Quatre plans, en mesures de deux secondes. Le reel en prend dix, la story
   sept et demie : c'est le défilé qui rend la différence, parce que c'est le
   seul plan qu'on peut raccourcir sans perdre un argument. */
const PLANS = COURT
  ? [{ cle: 'ouverture', duree: 3 }, { cle: 'fond', duree: 5 }, { cle: 'voile', duree: 3.5 }, { cle: 'appel', duree: 3.5 }]
  : [{ cle: 'ouverture', duree: 4 }, { cle: 'fond', duree: 8 }, { cle: 'voile', duree: 4 }, { cle: 'appel', duree: 4 }]
const TOTAL = PLANS.reduce((somme, p) => somme + p.duree, 0) * IPS

/* Le défilé du premier plan. Vingt motifs, choisis dans les huit groupes du
   moteur et dans les onze palettes : ce qui change à l'écran est la variété
   du catalogue, pas un effet. */
const DEFILE = [
  { famille: 'arcade', palette: 'nuit', densite: 1, graine: 7314 },
  { famille: 'truchet', palette: 'lime', densite: 1, graine: 2790 },
  { famille: 'sommets', palette: 'ciel', densite: 1, graine: 815 },
  { famille: 'azulejos', palette: 'corail', densite: 1, graine: 3311 },
  { famille: 'plis', palette: 'ardoise', densite: 1, graine: 4102 },
  { famille: 'vitrail', palette: 'encre', densite: 1, graine: 6402 },
  { famille: 'agrumes', palette: 'menthe', densite: 1, graine: 7726 },
  { famille: 'kintsugi', palette: 'argile', densite: 1, graine: 941 },
  { famille: 'persiennes', palette: 'orage', densite: 1, graine: 3095 },
  { famille: 'drape', palette: 'prune', densite: 1, graine: 1663 },
  { famille: 'horizon', palette: 'soleil', densite: 1, graine: 5518 },
  { famille: 'ecailles', palette: 'nuit', densite: 1, graine: 4870 },
  { famille: 'torii', palette: 'ciel', densite: 1, graine: 2231 },
  { famille: 'mire', palette: 'ardoise', densite: 1, graine: 1204 },
  { famille: 'vagues', palette: 'corail', densite: 1, graine: 6180 },
  { famille: 'mosaique', palette: 'lime', densite: 1, graine: 2048 },
  { famille: 'nuages', palette: 'ciel', densite: 1, graine: 3771 },
  { famille: 'tresse', palette: 'prune', densite: 1, graine: 5309 },
  { famille: 'bauhaus', palette: 'soleil', densite: 1, graine: 8821 },
  { famille: 'cubes', palette: 'encre', densite: 1, graine: 4407 },
]

/* Le motif du second plan : la sonde y pose le voile le plus fort qu'elle
   sache poser, et le rapport passe malgré tout le seuil AA. C'est le même
   que celui des cartes, pour la même raison. */
const VOILE = { famille: 'vagues', palette: 'soleil', densite: 1, graine: 7314 }
const CLOTURE = { famille: 'truchet', palette: 'lime', densite: 1, graine: 2790 }

/* Les libellés de la maquette du produit, dans son ordre. */
const APPLICATIONS = [
  'Appareil', 'Notes', 'Cartes', 'Musique', 'Météo', 'Horloge', 'Photos', 'Agenda',
  'Fichiers', 'Réglages', 'Podcasts', 'Rappels',
]

const e = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const HAUTEURS = ['100%', '62%', '86%', '50%', '74%']
const COULEURS = [
  'var(--encre)', 'var(--encre)', 'var(--lime)', 'var(--encre)',
  'var(--deco-1)', 'var(--encre)', 'var(--deco-2)',
]

function document_(feuille, styles) {
  const icones = APPLICATIONS.map(
    (nom, i) => `<span class="fi-app"><i data-rayon="${i}"></i><span>${nom}</span></span>`,
  ).join('')
  const lettres = [...'Aplat'].map((c) => `<b>${c}</b>`).join('')
  const barres = Array.from({ length: 20 }, (_, i) =>
    `<i style="height:${HAUTEURS[i % 5]};background:${COULEURS[i % 7]}"></i>`).join('')

  return `<!doctype html>
<html lang="fr" data-theme="clair">
<head>
<meta charset="utf-8">
<title>Aplat, le film</title>
<link rel="stylesheet" href="${feuille}">
<style>${styles}</style>
</head>
<body>
<div class="fi">

  <div class="fi-plan fi-ouverture" id="plan-ouverture">
    <p class="fi-sur fi-volet" id="o-sur">Fonds d’écran génératifs</p>
    <div class="fi-lockup">
      <span class="marque fi-volet" id="o-marque"><i></i><b></b></span>
      <span class="fi-nom" id="o-nom">${lettres}</span>
    </div>
    <p class="fi-accroche fi-volet" id="o-accroche">Un motif, une palette, une densité. Calculé dans ton navigateur.</p>
    <div class="fi-frise" id="o-frise">${barres}</div>
  </div>

  <div class="fi-plan" id="plan-fond" hidden>
    <canvas class="fi-toile" id="toile-fond"></canvas>
    <div class="fi-grille fi-volet" id="grille">${icones}</div>
    <p class="fi-legende"><span class="fi-volet" id="legende"></span></p>
    <p class="fi-compteur"><b id="compteur">1</b><span id="compteur-mot">motifs</span></p>
  </div>

  <div class="fi-plan" id="plan-voile" hidden>
    <div class="fi-couche"><canvas class="fi-toile" id="toile-sans"></canvas></div>
    <div class="fi-couche" id="couche-avec"><canvas class="fi-toile" id="toile-avec"></canvas></div>
    <div class="fi-grille" id="grille-voile">${icones}</div>
    <p class="fi-etiquette fi-etiquette-sans fi-volet" id="v-sans">sans voile</p>
    <p class="fi-etiquette fi-etiquette-avec fi-volet" id="v-avec">voile automatique</p>
    <p class="fi-verdict fi-volet" id="v-verdict"><i></i><span id="v-mesure"></span></p>
  </div>

  <div class="fi-plan fi-appel" id="plan-appel" hidden>
    <p class="fi-sur fi-volet" id="a-sur">En 15 secondes</p>
    <h2 class="fi-titre"><b class="fi-volet" id="a-t1">Prends</b><b class="fi-volet" id="a-t2">une graine</b></h2>
    <p class="fi-accroche fi-volet" id="a-accroche">3 choix, un clic, un PNG à la taille exacte de ton écran.</p>
    <div class="fi-bande fi-volet" id="a-bande"><canvas id="toile-cloture"></canvas></div>
    <span class="fi-bouton" id="a-bouton">Générer mon fond d’écran</span>
    <p class="fi-adresse fi-volet" id="a-adresse">${e(ADRESSE)}</p>
  </div>

</div>
</body>
</html>`
}

/**
 * Ce qui ne dépend pas du numéro d'image : les arrondis d'icône, les deux
 * toiles du voile, la bande de clôture, et les jetons de libellé.
 */
function preparer({ defile, voile, cloture }) {
  const M = window.MOTEUR
  window.__film = { defile, voile, cloture, dernier: null, changement: 0 }

  document.querySelectorAll('[data-rayon]').forEach((icone) => {
    icone.style.borderRadius = M.RAYONS[Number(icone.dataset.rayon) % M.RAYONS.length]
  })

  const toile = (id) => {
    const c = document.getElementById(id)
    c.width = 1080
    c.height = 1920
    return c.getContext('2d', { alpha: false })
  }
  toile('toile-fond')
  /* Les deux états du voile sont peints une fois pour toutes et superposés :
     le volet qui les découvre coûte alors une découpe, pas un rendu. */
  M.dessiner(toile('toile-sans'), 1080, 1920, voile, { voile: false })
  const mesure = M.dessiner(toile('toile-avec'), 1080, 1920, voile, { voile: true })
  document.getElementById('v-mesure').textContent =
    `Lisibilité ${M.niveau(mesure)}, ${mesure.contraste.toFixed(1).replace('.', ',')}:1`

  /* Les jetons de libellé, posés par la sonde, comme dans l'application. */
  window.__jetons = (boite, motif) => {
    const m = M.mesurer(motif.famille, motif.palette, motif.densite, motif.graine, 1080, 1920)
    const base = m.libelles === 'clair' ? '247,243,230' : '23,36,63'
    boite.style.setProperty('--libelle', m.libelles === 'clair' ? '#F7F3E6' : '#17243F')
    for (const o of [14, 15, 16, 20, 24, 26, 28, 90]) {
      boite.style.setProperty(`--l${o}`, `rgba(${base},${o / 100})`)
    }
    return m
  }
  window.__jetons(document.getElementById('plan-voile'), voile)

  const plan = document.getElementById('plan-appel')
  plan.hidden = false
  const fin = document.getElementById('toile-cloture')
  const boite = fin.getBoundingClientRect()
  fin.width = Math.max(2, Math.round(boite.width))
  fin.height = Math.max(2, Math.round(boite.height))
  M.dessiner(fin.getContext('2d', { alpha: false }), fin.width, fin.height, cloture, {
    mesureW: 2560, mesureH: 1440,
  })
  plan.hidden = true
}

/**
 * L'état de l'image `i`. Aucune horloge, aucune transition : tout ce qui
 * bouge est une propriété posée ici, calculée à partir du numéro.
 */
function etat({ i, ips, plans, temps, familles }) {
  const M = window.MOTEUR
  const f = window.__film

  let depart = 0
  let plan = plans[plans.length - 1]
  for (const p of plans) {
    if (i < (depart + p.duree) * ips) { plan = p; break }
    depart += p.duree
  }
  const local = i - depart * ips
  const fin = plan.duree * ips
  for (const p of plans) {
    document.getElementById(`plan-${p.cle}`).hidden = p.cle !== plan.cle
  }

  /* Les deux seules courbes du film. La sortie freine, l'entrée pousse : au
     delà, une image par image se remarque plus que le mouvement. */
  const sortie = (t) => 1 - Math.pow(1 - t, 3)
  const av = (debut, duree) => Math.max(0, Math.min(1, (local - debut) / duree))

  /* Le volet : le bord franc qui découvre, et le pas de côté qui l'accompagne.
     Rien n'apparaît en fondu, la direction artistique n'a pas de fondu. */
  const monte = (id, t, course = 30) => {
    const el = document.getElementById(id)
    const e = sortie(t)
    el.style.clipPath = `inset(${(1 - e) * 102}% 0 0 0)`
    el.style.transform = `translateY(${(1 - e) * course}px)`
  }
  const glisse = (id, t, course = 60) => {
    const el = document.getElementById(id)
    const e = sortie(t)
    el.style.clipPath = `inset(0 ${(1 - e) * 102}% 0 0)`
    el.style.transform = `translateX(${(1 - e) * -course}px)`
  }

  if (plan.cle === 'ouverture') {
    monte('o-sur', av(0, 10), 18)
    const marque = document.getElementById('o-marque')
    const m = sortie(av(6, 12))
    marque.style.clipPath = `inset(${(1 - m) * 102}% 0 0 0)`
    marque.style.transform = `translateY(${(1 - m) * 40}px)`
    /* Les cinq lettres, une par demi-temps : le nom s'écrit au lieu de
       s'afficher. */
    document.querySelectorAll('#o-nom b').forEach((lettre, k) => {
      const t = sortie(av(14 + k * (temps / 2), 11))
      lettre.style.clipPath = `inset(${(1 - t) * 104}% 0 0 0)`
      lettre.style.transform = `translateY(${(1 - t) * 48}px)`
    })
    monte('o-accroche', av(14 + 5 * (temps / 2) + 6, 14), 26)
    /* La frise se lève barre par barre, deux images d'écart : c'est le seul
       endroit du film où le décor bouge, et il se monte comme une palissade. */
    document.querySelectorAll('#o-frise i').forEach((barre, k) => {
      const t = sortie(av(2 * temps + k * 2, 9))
      barre.style.transform = `scaleY(${t})`
    })
  }

  if (plan.cle === 'fond') {
    /* Le défilé accélère puis se pose : un motif par temps, puis deux, puis
       un. C'est la façon dont on essaie vraiment les motifs, vite d'abord,
       puis on s'arrête sur celui qu'on garde. */
    const bornes = []
    let t0 = 0
    for (let k = 0; t0 < fin; k += 1) {
      bornes.push(t0)
      t0 += t0 < 4 * temps ? temps : t0 < 10 * temps ? temps / 2 : temps
    }
    let index = 0
    for (let k = 0; k < bornes.length; k += 1) if (local >= bornes[k]) index = k
    if (index !== f.dernier) {
      f.dernier = index
      f.changement = bornes[index]
      const motif = f.defile[index % f.defile.length]
      const c = document.getElementById('toile-fond')
      M.dessiner(c.getContext('2d', { alpha: false }), 1080, 1920, motif)
      window.__jetons(document.getElementById('plan-fond'), motif)
      const famille = M.FAMILLES.find((x) => x.id === motif.famille)
      document.getElementById('legende').innerHTML =
        `${famille ? famille.fr : motif.famille} <span>/ ${motif.palette} / graine ${motif.graine}</span>`
    }
    monte('grille', av(0, 14), 46)
    /* La légende se relève à chaque motif : le nom suit l'image au lieu de
       rester posé dessus. */
    monte('legende', Math.max(0, Math.min(1, (local - f.changement) / 8)), 22)

    /* Le compteur monte de 1 au nombre de familles pendant que les motifs
       passent. Il n'est pas décoratif : c'est ce que le défilé démontre. */
    const t = sortie(local / fin)
    const compte = Math.max(1, Math.round(1 + (familles - 1) * t))
    document.getElementById('compteur').textContent = String(compte)
    document.getElementById('compteur-mot').textContent = compte > 1 ? 'motifs' : 'motif'

    /* Une poussée très lente sur tout le plan : la caméra avance, rien ne
       tourne. */
    document.getElementById('plan-fond').style.transform =
      `scale(${(1 + 0.05 * (local / fin)).toFixed(4)})`
  }

  if (plan.cle === 'voile') {
    /* Le volet en diagonale, celui de la planche, mis en mouvement. Il passe
       sur un temps, revient sur un autre, et la différence saute aux yeux
       parce qu'elle bat. */
    const battements = [
      { a: 1.5 * temps, b: 1.5 * temps + 14, vers: 1 },
      { a: 5 * temps, b: 5 * temps + 12, vers: 0 },
      { a: 7 * temps, b: 7 * temps + 12, vers: 1 },
    ]
    let x = 0
    for (const bat of battements) {
      if (local >= bat.a) {
        const t = sortie(Math.max(0, Math.min(1, (local - bat.a) / (bat.b - bat.a))))
        x = bat.vers === 1 ? t : 1 - t
      }
    }
    const bord = 8 + x * 118
    document.getElementById('couche-avec').style.clipPath =
      `polygon(0 0, ${bord}% 0, ${bord - 14}% 100%, 0 100%)`

    /* L'étiquette « sans voile » se retire quand le volet a fini de passer :
       elle ne désigne plus rien une fois l'image entière voilée. */
    const reste = x > 0.85 ? Math.max(0, 1 - (x - 0.85) / 0.12) : 1
    monte('v-sans', Math.min(av(0, 12), reste), 20)
    monte('v-avec', av(1.5 * temps + 6, 12), 20)
    monte('v-verdict', av(2.5 * temps, 12), 20)
    document.getElementById('plan-voile').style.transform =
      `scale(${(1 + 0.04 * (local / fin)).toFixed(4)})`
  }

  if (plan.cle === 'appel') {
    monte('a-sur', av(0, 10), 16)
    monte('a-t1', av(4, 12), 46)
    monte('a-t2', av(4 + temps / 2, 12), 46)
    monte('a-accroche', av(temps + 6, 12), 26)
    monte('a-bande', av(2 * temps, 16), 40)
    /* Le bouton entre par la gauche, puis se pose : une seule pulsation, sur
       un temps, et c'est le dernier geste du film. */
    glisse('a-bouton', av(3 * temps, 12), 70)
    const pouls = av(4 * temps, 10)
    const echelle = pouls > 0 && pouls < 1 ? 1 + 0.05 * Math.sin(Math.PI * pouls) : 1
    const bouton = document.getElementById('a-bouton')
    bouton.style.transform =
      `translateX(${(1 - sortie(av(3 * temps, 12))) * -70}px) scale(${echelle.toFixed(4)})`
    monte('a-adresse', av(4 * temps + 8, 12), 18)
  }
}

;(async () => {
  fs.mkdirSync(SORTIE, { recursive: true })
  const styles = [
    fs.readFileSync(path.join(ICI, 'social.css'), 'utf8'),
    fs.readFileSync(path.join(ICI, 'film.css'), 'utf8'),
  ].join('\n')

  const encodeur = process.env.FFMPEG_EXE || 'ffmpeg'

  const document_html = fs.readFileSync(path.join(RACINE, 'dist', 'index.html'), 'utf8')
  const declaree = document_html.match(/href="([^"]+\.css)"/)
  if (!declaree) throw new Error('aucune feuille de style déclarée dans dist/index.html')

  const { srv, port } = await ouvrir()
  const base = `http://127.0.0.1:${port}`
  const browser = await launch()
  const ctx = await browser.newContext({
    viewport: { width: LARGEUR, height: HAUTEUR },
    deviceScaleFactor: 1,
    colorScheme: 'light',
    locale: 'fr-FR',
  })
  const page = await ctx.newPage()
  const erreurs = []
  page.on('pageerror', (err) => erreurs.push(err.message))

  await page.route('**/film.html', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/html; charset=utf-8',
      body: document_(declaree[1], styles),
    }),
  )
  await page.goto(`${base}/film.html`, { waitUntil: 'networkidle' })
  await poser(page)
  await page.evaluate(() => document.fonts.ready)

  const familles = await page.evaluate(() => window.MOTEUR.FAMILLES.length)
  await page.evaluate(preparer, { defile: DEFILE, voile: VOILE, cloture: CLOTURE })

  const fichier = path.join(SORTIE, COURT ? 'aplat-film-story-15s.mp4' : 'aplat-film-reel-20s.mp4')
  const ff = spawn(encodeur, [
    '-y',
    '-f', 'image2pipe',
    '-framerate', String(IPS),
    '-i', '-',
    '-c:v', 'libx264',
    '-preset', 'slow',
    '-crf', '19',
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    fichier,
  ], { stdio: ['pipe', 'ignore', 'pipe'] })

  let plainte = ''
  ff.stderr.on('data', (d) => { plainte += d.toString() })
  ff.on('error', () => {
    console.error(
      `\nEncodeur introuvable : « ${encodeur} ».\n` +
      'Installe FFmpeg, ou désigne-le par FFMPEG_EXE. Celui que Playwright\n' +
      'embarque ne sait faire que du WebM, qu’Instagram refuse.',
    )
    process.exit(1)
  })

  const ecrire = (buffer) =>
    new Promise((resolve) => (ff.stdin.write(buffer) ? resolve() : ff.stdin.once('drain', resolve)))

  const depart = Date.now()
  for (let i = 0; i < TOTAL; i += 1) {
    await page.evaluate(etat, { i, ips: IPS, plans: PLANS, temps: TEMPS, familles })
    const image = await page.screenshot({
      type: 'jpeg',
      quality: 96,
      clip: { x: 0, y: 0, width: LARGEUR, height: HAUTEUR },
    })
    await ecrire(image)
    if (i % 60 === 0) {
      const part = Math.round((i / TOTAL) * 100)
      process.stdout.write(`\r  ${part} %  (image ${i} sur ${TOTAL})   `)
    }
  }
  ff.stdin.end()
  await new Promise((resolve) => ff.on('close', resolve))

  await browser.close()
  srv.close()

  if (erreurs.length) console.log('\nerreurs de page :', erreurs.join(' | '))
  if (!fs.existsSync(fichier)) {
    console.error('\nl’encodage a échoué :\n' + plainte.split('\n').slice(-12).join('\n'))
    process.exit(1)
  }
  const poids = (fs.statSync(fichier).size / 1048576).toFixed(1)
  console.log(
    `\n${path.relative(RACINE, fichier)} : ${TOTAL} images, ${(TOTAL / IPS).toFixed(0)} s, ` +
    `${LARGEUR} × ${HAUTEUR}, ${poids} Mo, en ${Math.round((Date.now() - depart) / 1000)} s`,
  )
})()
