/* Le film des réseaux : « De 2,8 à 4,7 ».
 *
 * Vingt secondes, 1080 sur 1920, trente images par seconde, muet. Le montage
 * est calé sur 120 battements par minute : quinze images par temps.
 *
 * L'IDÉE. Une presse fabrique un fond d'écran couche par couche, une grille
 * d'icônes lui tombe dessus et noie les libellés, puis le voile monte force
 * par force jusqu'à ce que le rapport mesuré franchisse le seuil AA deux
 * images avant la fin de la rampe. Le film ne montre que ça, parce que doser
 * exactement ce qu'il faut est la seule chose qu'aucun autre générateur ne
 * sait faire.
 *
 * CE QUI N'EST PAS SAISI À LA MAIN. Le motif héros et les cinq plaques sont
 * trouvés par balayage de graine sur ce que la sonde AFFICHE, pas sur une
 * luminance visée. Les couleurs des aplats sortent des palettes du moteur.
 * Le seuil vient de SEUIL_AA. Les libellés d'icône viennent de la maquette du
 * produit. Le film n'écrit que quatre nombres, et aucun n'est écrit ici.
 *
 * QUATRE VITESSES, ET PAS UNE DE PLUS. La presse linéaire ; la rampe de voile
 * linéaire ; la coupe d'une seule image pour tout ce que la machine décide ;
 * la sortie cubique de cinq images pour ce qu'une main pose, et elle n'existe
 * que dans deux plans.
 *
 * Usage : npm run build, puis `node tools/film.mjs [adresse]`.
 * `CHROMIUM_EXE` désigne un Chromium présent, `FFMPEG_EXE` un encodeur H.264 :
 * celui que Playwright embarque est réduit au WebM, qu'Instagram refuse.
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

/* Une story coupe a quinze secondes, un reel non. La version courte n'est pas
   un fichier rogne ni un second montage : c'est le meme conducteur, dont on
   retire les quatre plaques d'essai et le plan des graines. La couture tombe
   entre l'image 149, qui montre le fichier et sa grille sans verdict, et
   l'image 285, qui montre le meme cadre avec le verdict : rien ne bouge a la
   jointure, et les deux arguments restants tiennent entiers. */
const COURT = ARGS.includes('--story')

const LARGEUR = 1080
const HAUTEUR = 1920
const IPS = 30
const TOTAL = 600
const IMAGES = COURT
  ? [...Array.from({ length: 150 }, (_, k) => k), ...Array.from({ length: 300 }, (_, k) => 285 + k)]
  : Array.from({ length: TOTAL }, (_, k) => k)

/* Les seize premiers libellés de la maquette du produit, dans son ordre. */
const APPLICATIONS = [
  'Appareil', 'Notes', 'Cartes', 'Musique', 'Météo', 'Horloge', 'Photos', 'Agenda',
  'Fichiers', 'Réglages', 'Podcasts', 'Rappels', 'Livres', 'Santé', 'Courrier', 'Radio',
]

const e = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function document_(feuille, styles) {
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
  <canvas id="scene" width="${LARGEUR}" height="${HAUTEUR}"></canvas>
  <div class="fi-grille" id="grille" hidden>${icones}</div>
  <div class="fi-machine" id="machine" hidden>
    <hr>
    <p id="m1"></p><p id="m2"></p><p id="m3"></p><p id="m4"></p>
  </div>
  <div class="fi-anton" id="anton" hidden></div>
  <p class="fi-pied" id="pied" hidden></p>
</div>
</body>
</html>`
}

/* --- La préparation, faite une fois -------------------------------------- */

/**
 * Cherche, par balayage de graine, un motif dont la sonde AFFICHE ce qu'on
 * veut. Le critère porte sur la chaîne rendue et non sur une luminance visée :
 * c'est le film qui suit le moteur, jamais l'inverse.
 */
function preparer({ applications }) {
  const M = window.MOTEUR
  const F = {}
  window.__f = F

  const decimal = (n) => n.toFixed(1).replace('.', ',')
  F.decimal = decimal

  /* La seule formule que le film copie au moteur. Il publie les deux bouts,
     `sansVoile()` pour la force nulle et `mesure.contraste` pour la force
     posée, mais rien pour le milieu, et la rampe vit précisément dans le
     milieu. La copie est donc vérifiée contre ses deux bouts au démarrage :
     si le moteur change sa formule, le film s'arrête au lieu d'annoncer un
     chiffre faux. */
  const contrasteA = (mesure, force) => {
    const L = mesure.luminance
    const apres = mesure.libelles === 'clair'
      ? L * (1 - force) + 0.018 * force
      : L * (1 - force) + 0.95 * force
    return mesure.libelles === 'clair' ? 1.05 / (apres + 0.05) : (apres + 0.05) / 0.068
  }
  F.contrasteA = contrasteA

  const trouver = (famille, palette, densite, test, plage = 400) => {
    for (let graine = 1; graine <= plage; graine += 1) {
      const m = M.mesurer(famille, palette, densite, graine, 1080, 1920)
      if (test(m)) return { motif: { famille, palette, densite, graine }, mesure: m }
    }
    return null
  }

  /* Le critère du film, et il ne porte que sur ce que la sonde AFFICHE : un
     fichier que le voile fait passer d'insuffisante à bonne. C'est
     exactement l'argument, et rien ne peut le satisfaire par hasard. */
  const repare = (m) => M.niveau(m) === 'bonne' && M.niveau(M.sansVoile(m)) === 'insuffisante'

  /* Le héros : parmi quelques candidats, celui dont l'écart mesuré est le plus
     grand. Les deux chiffres du titre du film sortent donc de cette mesure et
     ne sont écrits nulle part : si le moteur change, le titre change. */
  const CANDIDATS = [
    ['vagues', 'corail', 1], ['truchet', 'menthe', 2], ['ecailles', 'ciel', 2],
    ['azulejos', 'corail', 2], ['arcade', 'soleil', 2], ['mosaique', 'lime', 2],
  ]
  F.heros = CANDIDATS
    .map(([f, p, d]) => trouver(f, p, d, repare))
    .filter(Boolean)
    .sort((a, b) => (b.mesure.contraste - M.sansVoile(b.mesure).contraste)
      - (a.mesure.contraste - M.sansVoile(a.mesure).contraste))[0]
  if (!F.heros) throw new Error('aucun héros trouvé')

  /* Vérification de la copie contre le moteur, à ses deux bouts. */
  const h = F.heros.mesure
  const ecart0 = Math.abs(contrasteA(h, 0) - M.sansVoile(h).contraste)
  const ecart1 = Math.abs(contrasteA(h, h.voile) - h.contraste)
  if (ecart0 > 1e-9 || ecart1 > 1e-9) {
    throw new Error(`la formule de contraste du film ne suit plus le moteur (${ecart0}, ${ecart1})`)
  }

  /* Les cinq plaques : des fichiers que le produit sait réparer et qu'il n'a
     pas encore réparés. Le critère est le verdict affiché, aux deux états. */
  const PLAQUES = [
    ['horizon', 'nuit', 2], ['dunes', 'soleil', 2], ['azulejos', 'corail', 2],
    ['sommets', 'argile', 2], ['persiennes', 'prune', 2],
  ]
  F.plaques = PLAQUES.map(([f, p, d]) =>
    trouver(f, p, d, repare) || trouver(f, p, d, () => true, 1))

  /* La feuille que la presse tire à la fin, et qui reboucle sur le début. */
  F.cloture = { famille: 'sommets', palette: 'argile', densite: 2, graine: 4870 }

  /* Les six aplats du volet de couleur, toutes tirées du moteur. Clair,
     sombre, clair, sombre, clair, moyen : jamais deux valeurs voisines. */
  const P = M.PALETTES
  F.aplats = [
    P.lime.couleurs[0], P.nuit.fond, P.corail.couleurs[0],
    P.encre.fond, P.soleil.couleurs[0], P.ciel.fond,
  ]

  /* Les rendus, préparés une fois : chaque image du film n'est plus qu'un
     report de pixels et, pour la rampe, une couche de voile posée dessus. */
  const toile = (peintre) => {
    const c = new OffscreenCanvas(1080, 1920)
    peintre(c.getContext('2d', { alpha: false }))
    return c
  }
  const rendu = (motif, options) => toile((ctx) => M.dessiner(ctx, 1080, 1920, motif, options))

  F.presse = M.COUCHES.filter((c) => c !== 'ombre').map((arret) => rendu(F.heros.motif, { arret }))
  F.herosNu = rendu(F.heros.motif, { voile: false })
  F.herosPlein = rendu(F.heros.motif, {})
  F.plaquesNu = F.plaques.map((p) => rendu(p.motif, { voile: false }))
  F.plaquesPlein = F.plaques.map((p) => rendu(p.motif, {}))
  F.presseFin = M.COUCHES.filter((c) => c !== 'ombre').map((arret) => rendu(F.cloture, { arret }))

  /* Douze graines, prises à intervalle régulier sur toute la plage du
     produit : la famille, la palette et la densité ne bougent pas d'un cran,
     seule la graine change. */
  const pas = Math.floor(99999 / 12)
  F.graines = Array.from({ length: 12 }, (_, k) => rendu(
    { ...F.heros.motif, graine: 1 + k * pas }, {}))

  F.applications = applications
  F.jetons = (motif) => {
    const m = M.mesurer(motif.famille, motif.palette, motif.densite, motif.graine, 1080, 1920)
    const base = m.libelles === 'clair' ? '247,243,230' : '23,36,63'
    const fi = document.querySelector('.fi')
    fi.style.setProperty('--libelle', m.libelles === 'clair' ? '#F7F3E6' : '#17243F')
    for (const o of [14, 15, 16, 20, 24, 26, 28, 90]) {
      fi.style.setProperty(`--l${o}`, `rgba(${base},${o / 100})`)
    }
    return m
  }

  document.querySelectorAll('[data-rayon]').forEach((icone) => {
    icone.style.borderRadius = M.RAYONS[Number(icone.dataset.rayon) % M.RAYONS.length]
  })

  return {
    heros: { ...F.heros.motif, contraste: decimal(F.heros.mesure.contraste),
      sans: decimal(M.sansVoile(F.heros.mesure).contraste),
      voile: Math.round(F.heros.mesure.voile * 100) },
    plaques: F.plaques.map((p) => `${p.motif.famille}/${p.motif.palette}/${p.motif.graine}`),
    seuil: M.SEUIL_AA,
  }
}

/* --- L'état de l'image ---------------------------------------------------- */

function etat({ i, adresse, seuil }) {
  const M = window.MOTEUR
  const F = window.__f
  const scene = document.getElementById('scene')
  const ctx = scene.getContext('2d', { alpha: false })
  const grille = document.getElementById('grille')
  const machine = document.getElementById('machine')
  const anton = document.getElementById('anton')
  const pied = document.getElementById('pied')

  grille.hidden = true
  machine.hidden = true
  anton.hidden = true
  pied.hidden = true

  const lineaire = (a, b) => Math.max(0, Math.min(1, (i - a) / (b - a)))
  const cubique = (t) => 1 - Math.pow(1 - t, 3)

  /* La presse : quatre lames à bord franc, chacune posant une couche de plus.
     Elles traversent toujours le cadre entier, et rien n'est figé au départ. */
  const presse = (couches, depart, duree, ecart) => {
    ctx.drawImage(couches[0], 0, 0)
    for (let k = 0; k < couches.length; k += 1) {
      const a = depart + k * (duree + ecart)
      const t = lineaire(a, a + duree)
      if (t <= 0) continue
      ctx.save()
      ctx.beginPath()
      ctx.rect(0, 0, 1080 * t, 1920)
      ctx.clip()
      ctx.drawImage(couches[k], 0, 0)
      ctx.restore()
    }
  }

  /* Le mot troué : dehors le fichier livré, dedans le même motif arrêté à la
     couche formes. C'est le même tampon aux deux bouts du film, et il se lit
     comme une démonstration parce que la presse a posé les deux états sous
     les yeux au début. */
  const troue = (fond, dedans, ligne) => {
    ctx.drawImage(fond, 0, 0)
    const masque = new OffscreenCanvas(1080, 1920)
    const mc = masque.getContext('2d')
    mc.drawImage(dedans, 0, 0)
    mc.globalCompositeOperation = 'destination-in'
    let corps = 430
    mc.font = `${corps}px Anton`
    const large = mc.measureText('APLAT').width
    corps = Math.floor(corps * (888 / large))
    mc.font = `${corps}px Anton`
    mc.textBaseline = 'alphabetic'
    mc.fillText('APLAT', 96, ligne)
    ctx.drawImage(masque, 0, 0)
  }

  /* La voix de la machine : Archivo 30, sous l'unique filet du film, toujours
     au même endroit. Elle coupe, elle ne balaie jamais. */
  const dire = (lignes) => {
    machine.hidden = false
    for (let k = 0; k < 4; k += 1) {
      const p = document.getElementById(`m${k + 1}`)
      const l = lignes[k]
      p.hidden = !l
      p.innerHTML = l || ''
    }
  }
  const verdict = (mesure, force) => {
    const c = force === undefined ? mesure.contraste : F.contrasteA(mesure, force)
    const n = c >= 4.5 ? 'bonne' : c >= 3 ? 'juste' : 'insuffisante'
    return `<i class="fi-repere fi-repere-${n}"></i>Lisibilité ${n}, ${F.decimal(c)}:1`
  }

  /* La voix du film : Anton, posée par une main, donc par un volet. Chaque
     ligne est mise à l'échelle pour aller d'une marge à l'autre : c'est la
     longueur du mot qui décide de son corps. */
  const poser = (lignes, hautDepart) => {
    anton.hidden = false
    if (anton.dataset.cle !== lignes.map((l) => l.mot).join('|')) {
      anton.dataset.cle = lignes.map((l) => l.mot).join('|')
      anton.innerHTML = lignes.map((l) => `<b>${l.mot}</b>`).join('')
      anton.style.top = `${hautDepart}px`
      anton.querySelectorAll('b').forEach((b, k) => {
        b.style.fontSize = '100px'
        const portee = document.createRange()
        portee.selectNodeContents(b)
        const large = portee.getBoundingClientRect().width
        b.style.fontSize = `${Math.floor((100 * (lignes[k].large || 888)) / large)}px`
        b.style.marginTop = `${lignes[k].saut || 0}px`
      })
    }
    anton.querySelectorAll('b').forEach((b, k) => {
      const t = cubique(lineaire(lignes[k].a, lignes[k].a + 5))
      b.style.clipPath = `inset(0 ${(1 - t) * 100}% 0 0)`
      b.style.color = lignes[k].encre || '#17243F'
    })
  }

  const H = F.heros

  /* ---- 0 à 44 : la presse ------------------------------------------------ */
  if (i < 45) {
    presse(F.presse, 0, 7, 2)
    if (i >= 34) {
      troue(F.presse[3], F.presse[0], 1250)
      pied.hidden = false
      pied.style.top = '1300px'
      pied.style.color = '#F7F3E6'
      pied.textContent = adresse
    }
    return
  }

  /* ---- 45 à 74 : le volet de couleur ------------------------------------- */
  if (i < 75) {
    const k = Math.min(5, Math.floor((i - 45) / 5))
    ctx.fillStyle = F.aplats[k]
    ctx.fillRect(0, 0, 1080, 1920)
    M.peindreGrain(ctx, 1080, 1920)
    return
  }

  /* ---- 75 à 119 : la thèse ----------------------------------------------- */
  if (i < 120) {
    ctx.fillStyle = F.aplats[5]
    ctx.fillRect(0, 0, 1080, 1920)
    M.peindreGrain(ctx, 1080, 1920)
    poser([
      { mot: 'Ton fond', a: 75, large: 420, saut: 0 },
      { mot: 'd’écran,', a: 75, large: 420, saut: 12 },
      { mot: 'Tu lis', a: 90, large: 888, saut: 46 },
      { mot: 'Dessus.', a: 105, large: 888, saut: 8 },
    ], 380)
    return
  }

  /* ---- 120 à 164 : la grille tombe --------------------------------------- */
  if (i < 165) {
    ctx.drawImage(F.herosNu, 0, 0)
    F.jetons(H.motif)
    if (i >= 135) grille.hidden = false
    if (i >= 150) {
      dire([verdict(M.sansVoile(H.mesure)), `Seuil AA&nbsp;: ${F.decimal(seuil)}:1`])
    }
    return
  }

  /* ---- 165 à 284 : les cinq plaques -------------------------------------- */
  if (i < 285) {
    const PLAQUES = [
      { a: 165, aplat: 3, nu: 12, grille: 15 },
      { a: 195, aplat: 3, nu: 9, grille: 12 },
      { a: 219, aplat: 3, nu: 9, grille: 12 },
      { a: 243, aplat: 3, nu: 6, grille: 9 },
      { a: 261, aplat: 3, nu: 6, grille: 15 },
    ]
    let k = 0
    for (let n = 0; n < PLAQUES.length; n += 1) if (i >= PLAQUES[n].a) k = n
    const p = PLAQUES[k]
    const local = i - p.a
    const plaque = F.plaques[k]
    if (local < p.aplat) {
      ctx.fillStyle = M.palette(plaque.motif.palette).fond
      ctx.fillRect(0, 0, 1080, 1920)
      M.peindreGrain(ctx, 1080, 1920)
      return
    }
    ctx.drawImage(F.plaquesNu[k], 0, 0)
    F.jetons(plaque.motif)
    if (local >= p.aplat + p.nu) {
      grille.hidden = false
      dire([verdict(M.sansVoile(plaque.mesure))])
    }
    return
  }

  /* ---- 285 à 374 : le dosage, puis l'arrêt -------------------------------- */
  if (i < 375) {
    const force = i < 300 ? 0 : Math.min(H.mesure.voile, (i - 300) * (H.mesure.voile / 44))
    ctx.drawImage(F.herosNu, 0, 0)
    if (force > 0) {
      M.peindreVoile(ctx, 1080, 1920, { ...H.mesure, voile: force })
      M.peindreGrain(ctx, 1080, 1920)
    }
    F.jetons(H.motif)
    grille.hidden = false
    const lignes = [
      verdict(H.mesure, force),
      `Seuil AA&nbsp;: ${F.decimal(seuil)}:1`,
    ]
    if (i >= 300) lignes.push(`Voile ${Math.round(force * 100)}&nbsp;%`)
    if (i >= 345) lignes.push('<span>Le voile est dans le fichier, pas dans l’aperçu.</span>')
    dire(lignes)
    return
  }

  /* ---- 375 à 434 : la graine --------------------------------------------- */
  if (i < 435) {
    ctx.drawImage(F.graines[Math.min(11, Math.floor((i - 375) / 5))], 0, 0)
    F.jetons(H.motif)
    dire([`<span>99 999 graines. Seule la graine change.</span>`])
    return
  }

  /* ---- 435 à 464 : le prix ------------------------------------------------ */
  if (i < 465) {
    ctx.fillStyle = M.PALETTES.lime.couleurs[0]
    ctx.fillRect(0, 0, 1080, 1920)
    M.peindreGrain(ctx, 1080, 1920)
    poser([
      { mot: 'Gratuit', a: 435, large: 888, saut: 0 },
      { mot: 'Sans compte', a: 435, large: 888, saut: 10 },
      { mot: 'Hors ligne', a: 435, large: 888, saut: 10 },
    ], 640)
    return
  }

  /* ---- 465 à 539 : la signature ------------------------------------------ */
  if (i < 540) {
    troue(F.herosPlein, F.presse[0], 1180)
    if (i >= 495) {
      pied.hidden = false
      pied.style.top = '1250px'
      pied.style.color = '#F7F3E6'
      const t1 = cubique(lineaire(495, 500))
      const t2 = cubique(lineaire(510, 515))
      pied.innerHTML =
        `<span style="display:block;clip-path:inset(0 ${(1 - t1) * 100}% 0 0)">Prends-en un.</span>` +
        `<span style="display:block;margin-top:44px;clip-path:inset(0 ${(1 - t2) * 100}% 0 0)">${adresse}</span>`
    }
    return
  }

  /* ---- 540 à 599 : la presse repart -------------------------------------- */
  presse(F.presseFin, 540, 12, 4)
}

/* --- Le rendu -------------------------------------------------------------- */

;(async () => {
  fs.mkdirSync(SORTIE, { recursive: true })
  const styles = [
    fs.readFileSync(path.join(ICI, 'social.css'), 'utf8'),
    fs.readFileSync(path.join(ICI, 'film.css'), 'utf8'),
  ].join('\n')

  const encodeur = process.env.FFMPEG_EXE || 'ffmpeg'
  const html = fs.readFileSync(path.join(RACINE, 'dist', 'index.html'), 'utf8')
  const declaree = html.match(/href="([^"]+\.css)"/)
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

  const releve = await page.evaluate(preparer, { applications: APPLICATIONS })
  console.log(
    `héros : ${releve.heros.famille}/${releve.heros.palette}/graine ${releve.heros.graine}, ` +
    `${releve.heros.sans}:1 sans voile, ${releve.heros.contraste}:1 avec, voile ${releve.heros.voile} %`,
  )
  console.log(`plaques : ${releve.plaques.join(', ')}`)

  const fichier = path.join(SORTIE, COURT ? 'aplat-film-story-15s.mp4' : 'aplat-film-reel-20s.mp4')
  const ff = spawn(encodeur, [
    '-y', '-f', 'image2pipe', '-framerate', String(IPS), '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '19',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart', fichier,
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

  const ecrire = (b) =>
    new Promise((r) => (ff.stdin.write(b) ? r() : ff.stdin.once('drain', r)))

  const depart = Date.now()
  for (let k = 0; k < IMAGES.length; k += 1) {
    await page.evaluate(etat, { i: IMAGES[k], adresse: ADRESSE, seuil: releve.seuil })
    await ecrire(await page.screenshot({
      type: 'jpeg', quality: 96,
      clip: { x: 0, y: 0, width: LARGEUR, height: HAUTEUR },
    }))
    if (k % 60 === 0) process.stdout.write(`\r  ${Math.round((k / IMAGES.length) * 100)} %   `)
  }
  ff.stdin.end()
  await new Promise((r) => ff.on('close', r))
  await browser.close()
  srv.close()

  if (erreurs.length) console.log('\nerreurs de page :', erreurs.join(' | '))
  if (!fs.existsSync(fichier)) {
    console.error('\nl’encodage a échoué :\n' + plainte.split('\n').slice(-12).join('\n'))
    process.exit(1)
  }
  console.log(
    `\n${path.relative(RACINE, fichier)} : ${IMAGES.length} images, ${(IMAGES.length / IPS).toFixed(0)} s, ` +
    `${(fs.statSync(fichier).size / 1048576).toFixed(1)} Mo, ` +
    `en ${Math.round((Date.now() - depart) / 1000)} s`,
  )
})()
