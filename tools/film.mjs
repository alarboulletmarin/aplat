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

/* Les trois plans, en secondes. Vingt en tout : au-dessus, une story se
   coupe en deux ; en dessous, le voile n'a pas le temps de se démontrer. */
const PLANS = COURT
  ? [{ cle: 'fond', duree: 6 }, { cle: 'voile', duree: 4 }, { cle: 'appel', duree: 5 }]
  : [{ cle: 'fond', duree: 7 }, { cle: 'voile', duree: 6 }, { cle: 'appel', duree: 7 }]
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

function document_(feuille, styles, chiffres) {
  const icones = APPLICATIONS.map(
    (nom, i) => `<span class="fi-app"><i data-rayon="${i}"></i><span>${nom}</span></span>`,
  ).join('')

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
  <div class="fi-plan" id="plan-fond">
    <canvas class="fi-toile" id="toile-fond"></canvas>
    <div class="fi-grille" id="grille">${icones}</div>
    <p class="fi-legende" id="legende"></p>
    <p class="fi-compte" id="compte">${chiffres}</p>
  </div>

  <div class="fi-plan" id="plan-voile" hidden>
    <canvas class="fi-toile" id="toile-voile"></canvas>
    <div class="fi-grille" id="grille-voile">${icones}</div>
    <p class="fi-mot" id="mot"></p>
    <p class="fi-verdict" id="verdict"></p>
  </div>

  <div class="fi-plan fi-appel" id="plan-appel" hidden>
    <p class="st-surtitre">En 15 secondes</p>
    <h2 class="st-titre">Prends<br>une graine</h2>
    <p class="st-accroche">3 choix, un clic, un PNG à la taille exacte de ton écran.</p>
    <div class="fi-bande"><canvas id="toile-cloture"></canvas></div>
    <span class="st-appel">Générer mon fond d’écran</span>
    <p class="fi-adresse">${e(ADRESSE)}</p>
  </div>
</div>
</body>
</html>`
}

/**
 * Prépare la page : les arrondis d'icône, la toile de clôture, et la sonde.
 *
 * Tout ce qui ne dépend pas du numéro d'image est fait une fois. Le reste
 * l'est dans `etat`, qui doit rester assez court pour tourner trente fois par
 * seconde de film sans que l'encodage attende.
 */
function preparer({ defile, voile, cloture }) {
  const M = window.MOTEUR
  window.__film = { defile, voile, cloture, dernier: null, dernierVoile: null }

  document.querySelectorAll('[data-rayon]').forEach((icone) => {
    icone.style.borderRadius = M.RAYONS[Number(icone.dataset.rayon) % M.RAYONS.length]
  })

  for (const id of ['toile-fond', 'toile-voile']) {
    const c = document.getElementById(id)
    c.width = 1080
    c.height = 1920
  }
  const plan = document.getElementById('plan-appel')
  const cache = plan.hidden
  plan.hidden = false
  const fin = document.getElementById('toile-cloture')
  const boite = fin.getBoundingClientRect()
  fin.width = Math.max(2, Math.round(boite.width))
  fin.height = Math.max(2, Math.round(boite.height))
  plan.hidden = cache
  M.dessiner(fin.getContext('2d', { alpha: false }), fin.width, fin.height, cloture, {
    mesureW: 2560,
    mesureH: 1440,
  })

  /* Les jetons de libellé, posés par la sonde, comme dans l'application. */
  window.__jetons = (boite2, motif) => {
    const mesure = M.mesurer(motif.famille, motif.palette, motif.densite, motif.graine, 1080, 1920)
    const base = mesure.libelles === 'clair' ? '247,243,230' : '23,36,63'
    boite2.style.setProperty('--libelle', mesure.libelles === 'clair' ? '#F7F3E6' : '#17243F')
    for (const opacite of [14, 15, 16, 20, 24, 26, 28, 90]) {
      boite2.style.setProperty(`--l${opacite}`, `rgba(${base},${opacite / 100})`)
    }
    return mesure
  }
}

/** L'état de l'image numéro `i`. Aucune horloge, aucune transition. */
function etat({ i, ips, plans, familles }) {
  const M = window.MOTEUR
  const f = window.__film

  let debut = 0
  let plan = plans[plans.length - 1]
  for (const p of plans) {
    if (i < (debut + p.duree) * ips) { plan = p; break }
    debut += p.duree
  }
  const local = i - debut * ips

  for (const p of plans) {
    document.getElementById(`plan-${p.cle}`).hidden = p.cle !== plan.cle
  }

  if (plan.cle === 'fond') {
    /* Le défilé accélère puis se pose : douze images par motif au début,
       six au milieu, dix-huit à la fin. Ce n'est pas un effet, c'est la
       façon dont on essaie vraiment les motifs, vite d'abord, puis on
       s'arrête sur celui qu'on garde. */
    const secondes = local / ips
    const pas = secondes < 1.5 ? 12 : secondes < 5 ? 6 : 18
    const index = Math.floor(local / pas) % f.defile.length
    if (index !== f.dernier) {
      f.dernier = index
      const motif = f.defile[index]
      const toile = document.getElementById('toile-fond')
      M.dessiner(toile.getContext('2d', { alpha: false }), 1080, 1920, motif)
      window.__jetons(document.getElementById('plan-fond'), motif)
      const famille = M.FAMILLES.find((x) => x.id === motif.famille)
      document.getElementById('legende').innerHTML =
        `${famille ? famille.fr : motif.famille} <span>/ palette ${motif.palette} / graine ${motif.graine}</span>`
    }
    document.getElementById('compte').textContent =
      `${familles} motifs, 11 palettes, 3 densités, 99 999 graines`
  }

  if (plan.cle === 'voile') {
    /* Deux états, alternés : sans voile, avec voile. Le battement est ce qui
       rend la différence évidente, et il n'y a rien d'autre à montrer. */
    const avec = Math.floor(local / (ips * 0.9)) % 2 === 1
    if (avec !== f.dernierVoile) {
      f.dernierVoile = avec
      const toile = document.getElementById('toile-voile')
      M.dessiner(toile.getContext('2d', { alpha: false }), 1080, 1920, f.voile, { voile: avec })
      const mesure = window.__jetons(document.getElementById('plan-voile'), f.voile)
      document.getElementById('mot').textContent = avec ? 'voile automatique' : 'sans voile'
      document.getElementById('verdict').textContent = avec
        ? `Lisibilité ${M.niveau(mesure)}, ${mesure.contraste.toFixed(1).replace('.', ',')}:1`
        : 'Le contraste est mesuré sous la grille d’icônes'
    }
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
      body: document_(declaree[1], styles, ''),
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
    await page.evaluate(etat, { i, ips: IPS, plans: PLANS, familles })
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
