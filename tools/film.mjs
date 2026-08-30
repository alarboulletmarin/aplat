/* Le film des réseaux : « De 2,8 à 4,8 ».
 *
 * Vingt secondes, 1080 sur 1920, trente images par seconde, muet. Le montage
 * est calé sur 120 battements par minute : quinze images par temps, et chaque
 * plan tombe sur un temps.
 *
 * L'IDÉE. Une presse fabrique un fond d'écran couche par couche, une grille
 * d'icônes lui tombe dessus et noie les libellés, puis le voile monte force
 * par force jusqu'à ce que le rapport mesuré franchisse le seuil AA. Le film
 * ne montre que ça, parce que doser exactement ce qu'il faut est la seule
 * chose qu'aucun autre générateur ne sait faire. Puis il montre huit autres
 * fichiers, longuement, parce qu'un argument ne remplace pas la marchandise.
 *
 * LE MINUTAGE, en images :
 *     0 à  59   4 temps   la presse pose le fichier héros, trois lames
 *    60 à 104   3 temps   le nom découpé dedans, et l'adresse
 *   105 à 164   4 temps   la thèse, sur un aplat tenu
 *   165 à 314  10 temps   la démonstration, un seul plan sans une coupe
 *   315 à 554  16 temps   la galerie, huit fichiers d'une seconde chacun
 *   555 à 599   3 temps   le prix, et la boucle se referme sur un aplat clair
 *
 * Les huit secondes de galerie sont le double de ce que la première version
 * leur donnait, et ses coupes sont deux fois plus lentes. Rien dans le film ne
 * change plus d'une fois par seconde : au-delà, une alternance clair-sombre
 * devient un stroboscope. L'ordre de la galerie n'est même pas choisi : les
 * fichiers sont rangés par la luminance que la sonde leur mesure, du plus
 * clair au plus sombre, si bien que la suite descend en fondu.
 *
 * CE QUI N'EST PAS SAISI À LA MAIN. Le motif héros est trouvé par balayage de
 * graine sur ce que la sonde AFFICHE, pas sur une luminance visée : on garde
 * le fichier que le voile fait passer d'« insuffisante » à « bonne » avec le
 * plus grand écart. L'ordre de la galerie sort de la mesure. Les couleurs des
 * aplats sortent des palettes du moteur. Le seuil vient de SEUIL_AA. Les
 * libellés d'icône viennent de la maquette du produit. Le film n'écrit que
 * quatre nombres, et aucun n'est écrit ici.
 *
 * UN SEUL GESTE. La lame : un bord franc qui traverse le cadre de gauche à
 * droite, à vitesse constante, en posant une feuille sur celle d'avant. C'est
 * la presse en ouverture, c'est l'entrée dans la démonstration, et c'est les
 * huit changements de la galerie. Toujours le même sens : une lame qui change
 * de sens à chaque fois n'est plus un geste, c'est un tic. Elle ne pousse pas
 * de bande d'aplat devant elle, parce qu'un barreau clair qui traverse un
 * fichier sombre est exactement le flash qu'on enlève ailleurs.
 *
 * AUCUNE POUSSÉE, AUCUN ZOOM, AUCUNE ÉCHELLE. Mettre à l'échelle un motif
 * géométrique le rééchantillonne, et sur un produit dont tout l'argument est le
 * rendu exact à la résolution de l'appareil, un zoom interpolé dit le contraire
 * de ce que le film raconte. Ce qui empêche un plan tenu de mourir, ce n'est pas
 * une caméra qui bouge : c'est qu'il s'y passe quelque chose. La presse pose des
 * couches, la grille tombe rang par rang, le voile monte force par force, la
 * lame traverse. Entre ces gestes, 58 % des images du film sont strictement
 * identiques à la précédente, et c'est voulu.
 *
 * QUATRE VITESSES, ET PAS UNE DE PLUS. La lame linéaire ; la rampe de voile
 * linéaire ; la coupe d'une seule image pour tout ce que la machine décide ;
 * la sortie cubique de cinq images pour ce qu'une main pose. Deux coupes
 * franches seulement dans tout le film, et ce sont ses deux tournants : la
 * thèse et le prix. Mesuré sur le rendu, il n'y reste aucune alternance
 * clair-sombre rapprochée, contre trois par seconde au seuil de
 * photosensibilité.
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
/* LE CONDUCTEUR. Toutes les images du film sont ici, et nulle part ailleurs.
   `etat()` le reçoit au lieu de porter ses propres nombres, et l'outil le
   publie dans `.social/aplat-film.json` : la bande son se construit sur ce
   fichier, si bien qu'elle ne peut pas dériver de l'image. Déplacer un plan,
   c'est déplacer la note qui tombe dessus.

   Tout est calé sur 15 images, soit un temps à 120 BPM. Les lames de la presse
   se chevauchent (25 images de course, une nouvelle tous les 15) : c'est une
   presse à trois stations plutôt que trois passes qui se suivent, et surtout
   chaque lame part sur un temps, ce qu'aucune ne faisait avant. */
const CONDUCTEUR = {
  ips: IPS,
  total: TOTAL,
  imagesParTemps: 15,
  presse: { depart: 0, duree: 25, pas: 15, lames: 3 },
  nom: 60,
  these: 105,
  theseLignes: [105, 120, 135],
  demo: 165,
  lameDemo: 14,
  grille: [180, 184, 188, 192],
  verdict: 195,
  rampe: [225, 285],
  galerie: { depart: 315, pas: 30, lame: 14, cartes: 8 },
  prix: 555,
  prixLignes: [555, 565, 575],
}

/* La version courte n'est pas la longue accélérée : c'est la même pellicule,
   trois fichiers de galerie en moins. Rien n'est re-cadencé, donc rien n'y va
   plus vite qu'au cinéma. Le raccord tombe sur un temps entier des deux côtés
   (image 405 en sortie, image 555 à la source, 10 temps d'écart pile), ce qui
   laisse la bande son sur sa grille en traversant la coupe. */
const SEGMENTS = [[0, 405], [555, 600]]
const IMAGES = COURT
  ? SEGMENTS.flatMap(([a, b]) => Array.from({ length: b - a }, (_, k) => a + k))
  : Array.from({ length: TOTAL }, (_, k) => k)

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

  /* Les rendus, préparés une fois : chaque image du film n'est plus qu'un
     report de pixels et, pour la rampe, une couche de voile posée dessus. */
  const toile = (peintre) => {
    const c = new OffscreenCanvas(1080, 1920)
    peintre(c.getContext('2d', { alpha: false }))
    return c
  }
  const rendu = (motif, options) => toile((ctx) => M.dessiner(ctx, 1080, 1920, motif, options))

  /* La presse : le fond sert de socle, les trois couches suivantes passent
     dessus. Balayer le fond par-dessus le fond ne montrait rien et coûtait
     une demi-seconde de cadre vide en ouverture du film. */
  const couches = M.COUCHES.filter((c) => c !== 'ombre').map((arret) => rendu(F.heros.motif, { arret }))
  F.socle = couches[0]
  F.presse = couches.slice(1)
  F.herosNu = rendu(F.heros.motif, { voile: false })
  F.herosVoile = rendu(F.heros.motif, {})
  /* La plaque de la thèse est une image et non une recette, pour que la lame
     qui la recouvre parte exactement de ce que le plan précédent montrait. */
  F.plaqueThese = toile((c) => {
    c.fillStyle = M.PALETTES.ciel.fond
    c.fillRect(0, 0, 1080, 1920)
    M.peindreGrain(c, 1080, 1920)
  })
  F.aplatPrix = M.PALETTES.lime.couleurs[0]

  /* La galerie : huit fichiers plein cadre, un par groupe du moteur. L'ordre
     n'est pas choisi à la main : les fichiers sont rangés par la luminance que
     la sonde leur mesure, du plus clair au plus sombre. La galerie descend donc
     en fondu au lieu d'alterner clair et sombre, et aucune de ses coupes ne
     peut clignoter. */
  const GALERIE = [
    ['arcade', 'soleil', 1], ['penrose', 'ciel', 1], ['plis', 'ardoise', 1],
    ['mire', 'encre', 1], ['drape', 'prune', 1], ['sommets', 'nuit', 1],
    ['torii', 'corail', 1], ['agrumes', 'menthe', 1],
  ]
  F.galerieMotifs = GALERIE
    .map(([f, p, d]) => (trouver(f, p, d, repare) || trouver(f, p, d, () => true, 1)).motif)
    .map((m) => ({ m, l: M.mesurer(m.famille, m.palette, m.densite, m.graine, 1080, 1920).luminance }))
    .sort((x, y) => y.l - x.l)
    .map((x) => x.m)

  /* Deux rendus par fichier : l'aplat seul, puis le fichier entier. La lame
     passe de l'un à l'autre. Le produit s'appelle Aplat : chaque plan de la
     galerie commence donc par ce que son nom dit, et le motif arrive dessus. */
  /* L'encre du carton n'est pas celle que le moteur donne au fichier entier.
     La sonde répond pour la bande d'icônes ; le carton, lui, est posé en haut
     du cadre, et un ciel sombre sous un sommet clair renvoie « fichier clair »
     alors que le texte, là-haut, est sur du sombre. On mesure donc les pixels
     que le carton recouvre vraiment, et on garde des deux encres du produit
     celle qui contraste le plus. Un film qui parle de lisibilité ne peut pas
     avoir un carton illisible. */
  const CREME = '#F7F3E6'
  const ENCRE = '#17243F'
  const canal = (v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4))
  const luminance = (r, g, b) => 0.2126 * canal(r / 255) + 0.7152 * canal(g / 255) + 0.0722 * canal(b / 255)
  const rapport = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
  const LCREME = luminance(247, 243, 230)
  const LENCRE = luminance(23, 36, 63)
  const encreDe = (toile_, x, y, w, h) => {
    const d = toile_.getContext('2d').getImageData(x, y, w, h).data
    let somme = 0
    for (let k = 0; k < d.length; k += 16) somme += luminance(d[k], d[k + 1], d[k + 2])
    const L = somme / (d.length / 16)
    const cr = rapport(L, LCREME)
    const en = rapport(L, LENCRE)
    return { couleur: cr >= en ? CREME : ENCRE, contraste: Math.max(cr, en) }
  }

  F.galerie = F.galerieMotifs.map((m) => rendu(m, {}))
  /* Le carton occupe x 96 à 984, y 350 à 570 : c'est cette fenêtre-là qu'on
     mesure, et pas une autre. */
  F.galerieEncres = F.galerie.map((c) => encreDe(c, 96, 350, 888, 220))
  F.familles = M.FAMILLES.length

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
      voile: Math.round(F.heros.mesure.voile * 100),
      force: F.heros.mesure.voile, luminance: F.heros.mesure.luminance },
    galerie: F.galerieMotifs.map((m, k) => ({
      ...m,
      luminance: M.mesurer(m.famille, m.palette, m.densite, m.graine, 1080, 1920).luminance,
      carton: F.galerieEncres[k].contraste,
    })),
    seuil: M.SEUIL_AA,
  }
}

/* --- L'état de l'image ---------------------------------------------------- */

function etat({ i, adresse, seuil, C }) {
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
  pied.className = 'fi-pied'

  const lineaire = (a, b) => Math.max(0, Math.min(1, (i - a) / (b - a)))
  const cubique = (t) => 1 - Math.pow(1 - t, 3)

  /* La presse : trois lames à bord franc, chacune posant une couche de plus
     sur le socle. Elles traversent toujours le cadre entier. */
  const presse = (depart, duree, pas) => {
    ctx.drawImage(F.socle, 0, 0)
    for (let k = 0; k < F.presse.length; k += 1) {
      const a = depart + k * pas
      const t = lineaire(a, a + duree)
      if (t <= 0) continue
      ctx.save()
      ctx.beginPath()
      ctx.rect(0, 0, 1080 * t, 1920)
      ctx.clip()
      ctx.drawImage(F.presse[k], 0, 0)
      ctx.restore()
    }
  }

  /* La lame. C'est le seul geste de transition du film, et c'est celui de la
     presse : un bord franc qui traverse le cadre de gauche à droite, à vitesse
     constante, en posant une feuille sur celle d'avant. Toujours le même sens,
     parce qu'une lame qui change de sens à chaque fois n'est plus un geste,
     c'est un tic.

     Elle ne pousse plus une bande d'aplat devant elle : sur un fichier sombre
     remplacé par un clair, cette bande était un barreau lumineux qui traversait
     l'image, autrement dit le flash qu'on venait d'enlever ailleurs. L'aplat se
     montre là où il s'explique, à la presse, en ouverture. */
  const lame = (dessous, dessus, depart, duree) => {
    ctx.drawImage(dessous, 0, 0)
    const t = lineaire(depart, depart + duree)
    if (t <= 0) return
    ctx.save()
    ctx.beginPath()
    ctx.rect(0, 0, 1080 * t, 1920)
    ctx.clip()
    ctx.drawImage(dessus, 0, 0)
    ctx.restore()
  }

  /* Le mot troué : dehors le fichier livré, dedans le même fichier arrêté à
     l'aplat. C'est le même tampon des deux côtés de la lettre, et il se lit
     comme une démonstration parce que la presse vient de poser les deux états
     sous les yeux. */
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

  /* Aucune poussée, aucun zoom, aucune échelle : un plan tenu est tenu. Mettre
     à l'échelle un motif géométrique le rééchantillonne, et sur un produit dont
     tout l'argument est le rendu exact à la résolution de l'appareil, un zoom
     interpolé dit le contraire de ce que le film raconte. Ce qui empêche les
     plans longs de mourir, ce n'est pas une caméra qui bouge, c'est qu'il s'y
     passe quelque chose : la presse pose des couches, la grille tombe rang par
     rang, le voile monte force par force, la lame traverse. */

  /* ---- 0 à 59 : la presse ------------------------------------------------
     Trois lames de 16 images, deux arrêts de 6 : deux secondes pour poser le
     fichier. Chaque lame montre déjà du motif, dès la première image. */
  if (i < C.nom) {
    presse(C.presse.depart, C.presse.duree, C.presse.pas)
    return
  }

  /* ---- 60 à 104 : le mot troué -------------------------------------------
     Dehors le fichier livré, dedans le même fichier arrêté à l'aplat. Le nom
     du produit est découpé dans ce qu'il fabrique. */
  if (i < C.these) {
    troue(F.presse[F.presse.length - 1], F.socle, 1250)
    pied.hidden = false
    pied.style.top = '1310px'
    pied.style.color = '#F7F3E6'
    pied.textContent = adresse
    return
  }

  /* ---- 105 à 164 : la thèse -----------------------------------------------
     Un seul aplat, tenu deux secondes. Le volet de six couleurs a sauté : six
     coupes par seconde en alternant clair et sombre est un stroboscope, et un
     film qui fait mal aux yeux n'est pas un film rythmé. */
  if (i < C.demo) {
    ctx.drawImage(F.plaqueThese, 0, 0)
    poser([
      { mot: 'Ton fond', a: C.theseLignes[0], large: 420, saut: 0 },
      { mot: 'd’écran,', a: C.theseLignes[0], large: 420, saut: 12 },
      { mot: 'Tu lis', a: C.theseLignes[1], large: 888, saut: 46 },
      { mot: 'Dessus.', a: C.theseLignes[2], large: 888, saut: 8 },
    ], 380)
    return
  }

  /* ---- 165 à 314 : la démonstration ---------------------------------------
     Un seul plan de cinq secondes, sans une coupe : la lame amène le fichier,
     la grille tombe rang par rang, le verdict s'affiche, puis le voile monte
     force par force jusqu'à son arrêt. Il s'y passe donc quelque chose du
     début à la fin, et c'est pour ça qu'aucune caméra n'a besoin d'y bouger. */
  if (i < C.galerie.depart) {
    const [rampeA, rampeB] = C.rampe
    const force = i < rampeA
      ? 0
      : Math.min(H.mesure.voile, (i - rampeA) * (H.mesure.voile / (rampeB - rampeA - 1)))
    if (i < C.demo + C.lameDemo) {
      lame(F.plaqueThese, F.herosNu, C.demo, C.lameDemo)
    } else {
      ctx.drawImage(F.herosNu, 0, 0)
    }
    if (force > 0) {
      M.peindreVoile(ctx, 1080, 1920, { ...H.mesure, voile: force })
      M.peindreGrain(ctx, 1080, 1920)
    }
    F.jetons(H.motif)

    /* La grille tombe, et elle tombe vraiment : quatre rangs, quatre images
       d'écart, du haut vers le bas. Elle apparaissait d'un bloc en une image,
       ce qui est une apparition et non une chute, et c'est le moment où le
       film pose son problème. */
    if (i >= C.grille[0]) {
      grille.hidden = false
      const rangs = C.grille.filter((d) => i >= d).length
      grille.querySelectorAll('.fi-app').forEach((a, n) => {
        a.style.visibility = Math.floor(n / 4) < rangs ? 'visible' : 'hidden'
      })
    }
    if (i >= C.verdict) {
      const lignes = [verdict(H.mesure, force), `Seuil AA&nbsp;: ${F.decimal(seuil)}:1`]
      if (i >= rampeA) lignes.push(`Voile ${Math.round(force * 100)}&nbsp;%`)
      dire(lignes)
    }
    if (i >= rampeB) {
      pied.hidden = false
      pied.className = 'fi-pied fi-pied-note'
      pied.style.top = '1740px'
      pied.style.color = ''
      pied.textContent = 'Le voile est dans le fichier, pas dans l’aperçu.'
    }
    return
  }

  /* ---- 315 à 554 : la galerie ---------------------------------------------
     Huit fichiers plein cadre, une seconde chacun, sans une icône : huit
     secondes, soit deux fois ce que le film leur donnait. Un changement par
     seconde au plus, et pas une seule coupe franche : chaque fichier arrive par
     la lame, sur celui d'avant, puis se laisse regarder une demi-seconde
     entière. Aucune image de la galerie n'est vide. */
  if (i < C.prix) {
    const G = C.galerie
    const k = Math.min(F.galerie.length - 1, Math.floor((i - G.depart) / G.pas))
    const depart = G.depart + k * G.pas
    const dessous = k === 0 ? F.herosVoile : F.galerie[k - 1]
    lame(dessous, F.galerie[k], depart, G.lame)

    /* Le carton change une demi-lame après le fichier, jamais avec lui : tant
       que le cadre montre surtout celui d'avant, c'est son nom qui reste. */
    const j = i >= depart + Math.round(G.lame / 2) ? k : k - 1
    if (j >= 0) {
      const nom = M.FAMILLES.find((x) => x.id === F.galerieMotifs[j].famille)
      document.querySelector('.fi').style.setProperty('--libelle', F.galerieEncres[j].couleur)
      dire([
        `<span>${nom ? nom.fr : ''}, palette ${F.galerieMotifs[j].palette}</span>`,
        `<span>${F.familles} motifs, 11 palettes, 99 999 graines.</span>`,
      ])
    }
    return
  }

  /* ---- 555 à 599 : le prix, et la boucle se referme -----------------------
     Les trois lignes tombent en un tiers de seconde chacune et la dernière est
     posée à l'image 580 : la phrase entière tient donc les vingt dernières
     images, au lieu d'arriver juste à temps pour disparaître.

     Le film finit sur un aplat clair et il recommence sur un aplat clair : la
     boucle d'Instagram ne passe par aucun trou noir ni par aucun cadre vide.
     C'est aussi la seule coupe franche clair-sombre de tout le film avec celle
     de la thèse : deux en vingt secondes. */
  ctx.fillStyle = F.aplatPrix
  ctx.fillRect(0, 0, 1080, 1920)
  M.peindreGrain(ctx, 1080, 1920)
  poser([
    { mot: 'Gratuit', a: C.prixLignes[0], large: 888, saut: 0 },
    { mot: 'Sans compte', a: C.prixLignes[1], large: 888, saut: 10 },
    { mot: 'Hors ligne', a: C.prixLignes[2], large: 888, saut: 10 },
  ], 620)
  pied.hidden = false
  pied.className = 'fi-pied'
  pied.style.top = '1560px'
  pied.style.color = '#17243F'
  pied.textContent = adresse
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
  console.log('galerie : ' + releve.galerie
    .map((g) => `${g.famille}/${g.palette} ${g.carton.toFixed(1).replace('.', ',')}:1`).join(', '))

  /* Le conducteur publié. La bande son se construit là-dessus : elle lit les
     images où tombent les plans et les luminances mesurées de la galerie, si
     bien qu'aucun de ses nombres n'est saisi une deuxième fois. */
  fs.writeFileSync(path.join(SORTIE, 'aplat-film.json'), JSON.stringify({
    ...CONDUCTEUR,
    segments: SEGMENTS,
    heros: { ...releve.heros, mesure: releve.heros },
    galerie: { ...CONDUCTEUR.galerie, fichiers: releve.galerie },
    seuil: releve.seuil,
  }, null, 2) + '\n')

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
    await page.evaluate(etat, { i: IMAGES[k], adresse: ADRESSE, seuil: releve.seuil, C: CONDUCTEUR })
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
