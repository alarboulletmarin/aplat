/* La bande son du film : « De 2,8 à 4,8 ».
 *
 * Elle n'est pas choisie, elle est construite sur le conducteur que le film
 * publie dans `.social/aplat-film.json`. Chaque son tombe sur un plan, et
 * aucun nombre n'est saisi ici une deuxième fois : déplacer une image dans le
 * film déplace la note qui tombe dessus.
 *
 * POURQUOI LA FABRIQUER PLUTOT QUE L'ACHETER. Une piste de banque ne tombera
 * jamais sur les images 105, 180, 315 et 555. Celle-ci ne fait que ça. Et
 * comme elle est synthétisée ici, de bout en bout, elle ne peut recevoir
 * aucune revendication de droits sur Instagram.
 *
 * CE QUI EST MESURÉ PLUTOT QUE CHOISI. Les huit notes de la galerie ont leur
 * hauteur tirée de la luminance que la sonde mesure sur chaque fichier. La
 * galerie est rangée du plus clair au plus sombre, donc la mélodie descend, et
 * elle descend exactement comme l'image s'assombrit. Le timbre du bourdon suit
 * la force du voile image par image : la rampe du film, qui est son argument,
 * est aussi ce qu'on entend s'ouvrir.
 *
 * SIX SONS, ET PAS UN DE PLUS. Le battement, sur le temps. La lame, un
 * balayage de bruit filtré panoramiqué de gauche à droite, exactement comme la
 * lame de l'image. Le clic, quatre fois, quand la grille tombe rang par rang.
 * Le bourdon, dont le filtre s'ouvre avec le voile. La cloche, une par fichier.
 * L'accord, deux fois, sur les deux seules coupes franches du film.
 *
 * DÉTERMINISTE. Le bruit sort d'un générateur à graine fixe, pas de
 * `Math.random()` : deux exports donnent le même fichier, comme pour l'image.
 *
 * Usage : `node tools/film.mjs` d'abord (il écrit le conducteur), puis
 * `node tools/musique.mjs`. Les deux MP4 repartent avec leur son.
 * `FFMPEG_EXE` désigne un encodeur H.264 + AAC.
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ICI = fileURLToPath(new URL('.', import.meta.url))
const RACINE = path.resolve(ICI, '..')
const SORTIE = path.resolve(RACINE, '.social')
const TAUX = 48000

const conducteur = path.join(SORTIE, 'aplat-film.json')
if (!fs.existsSync(conducteur)) {
  console.error(
    'Conducteur introuvable. Lance d’abord `npm run film` : c’est lui qui\n' +
    'publie .social/aplat-film.json, et la bande son se construit dessus.',
  )
  process.exit(1)
}
const C = JSON.parse(fs.readFileSync(conducteur, 'utf8'))

/* --- Les outils du son ------------------------------------------------------
   Rien d'emprunté : quelques oscillateurs, deux filtres à un pôle et des
   enveloppes exponentielles suffisent, et c'est plus honnête qu'une
   bibliothèque pour six sons. */

/* Un générateur à graine fixe : le bruit du film doit être le même à chaque
   export, comme ses pixels. */
let graine = 0x9e3779b9
const alea = () => {
  graine ^= graine << 13
  graine ^= graine >>> 17
  graine ^= graine << 5
  return ((graine >>> 0) / 4294967296) * 2 - 1
}

const TAU = Math.PI * 2
/* Le coefficient d'un passe-bas à un pôle pour une fréquence de coupure. */
const pole = (coupure) => 1 - Math.exp((-TAU * coupure) / TAUX)

class Piste {
  constructor(secondes) {
    this.n = Math.round(secondes * TAUX)
    this.g = new Float32Array(this.n)
    this.d = new Float32Array(this.n)
  }

  /* Poser un son à un instant donné, en images du film. */
  poser(image, rendre) {
    const depart = Math.round((image / C.ips) * TAUX)
    rendre((k, gauche, droite) => {
      const i = depart + k
      if (i < 0 || i >= this.n) return
      this.g[i] += gauche
      this.d[i] += droite === undefined ? gauche : droite
    })
  }
}

/* Le battement : une sinusoïde dont la hauteur tombe vite, et une attaque de
   bruit passée dans un passe-bas. Le bruit brut, à large bande, faisait de
   chaque temps un clic qui traversait tout le spectre : quarante barres
   verticales sur le sonagramme, et un métronome à la place d'une pulsation.
   Filtré à 1400 Hz et éteint en six millisecondes, il donne le coup et pas le
   tic. */
function battement(force = 1) {
  return (mettre) => {
    const n = Math.round(0.3 * TAUX)
    let phase = 0
    let attaque = 0
    for (let k = 0; k < n; k += 1) {
      const t = k / TAUX
      phase += (TAU * (46 + 62 * Math.exp(-t / 0.032))) / TAUX
      attaque += pole(1400) * (alea() - attaque)
      const v = Math.sin(phase) * Math.exp(-t / 0.09) + attaque * 0.55 * Math.exp(-t / 0.006)
      mettre(k, v * 0.5 * force)
    }
  }
}

/* La lame : du bruit passé dans une bande qui monte, et panoramiqué de gauche
   à droite pendant sa course. C'est le seul son du film qui se déplace, comme
   la lame est le seul geste de l'image qui se déplace. */
function lame(images, force = 1) {
  return (mettre) => {
    const n = Math.round((images / C.ips) * TAUX)
    /* Trois pôles et non un seul. Un passe-bas à un pôle ne descend que de six
       décibels par octave : la lame passait alors sur tout le spectre jusqu'à
       vingt kilohertz, c'est-à-dire un souffle blanc, et huit souffles blancs
       en huit secondes couvraient le reste de la bande. */
    const bas = [0, 0, 0]
    let tres = 0
    for (let k = 0; k < n; k += 1) {
      const t = k / TAUX
      const u = k / n
      const c = pole(900 + 5400 * u)
      let v = alea()
      for (let j = 0; j < bas.length; j += 1) {
        bas[j] += c * (v - bas[j])
        v = bas[j]
      }
      tres += pole(320) * (v - tres)
      /* La chute est proportionnelle à la course, et non fixe : avec une
         constante unique, le son était fini avant que le panoramique ait
         atteint la droite, si bien que la lame de l'oreille ne traversait pas
         quand la lame de l'image traversait. */
      const s = (v - tres) * Math.min(1, t / 0.006) * Math.exp(-t / ((n / TAUX) * 0.45)) * 3.5 * force
      mettre(k, s * Math.sqrt(1 - u), s * Math.sqrt(u))
    }
  }
}

/* Le clic de la grille : une sinusoïde très courte. Quatre rangs, quatre
   hauteurs, qui descendent comme les rangs descendent. */
function clic(hauteur, force = 1) {
  return (mettre) => {
    const n = Math.round(0.09 * TAUX)
    for (let k = 0; k < n; k += 1) {
      const t = k / TAUX
      mettre(k, Math.sin(TAU * hauteur * t) * Math.exp(-t / 0.014) * 0.2 * force)
    }
  }
}

/* La cloche d'un fichier : une fondamentale, son octave, et une partielle
   inharmonique qui lui donne le grain d'un métal frappé. */
function cloche(hauteur, secondes, force = 1) {
  return (mettre) => {
    const n = Math.round(secondes * TAUX)
    for (let k = 0; k < n; k += 1) {
      const t = k / TAUX
      const v =
        Math.sin(TAU * hauteur * t) * Math.exp(-t / 0.55) +
        Math.sin(TAU * hauteur * 2 * t) * 0.26 * Math.exp(-t / 0.3) +
        Math.sin(TAU * hauteur * 2.76 * t) * 0.1 * Math.exp(-t / 0.16)
      mettre(k, v * Math.min(1, t / 0.004) * 0.36 * force)
    }
  }
}

/* Une note tenue, sinusoïdale, avec un souffle d'attaque et de chute. */
function tenue(hauteur, secondes, force = 1) {
  return (mettre) => {
    const n = Math.round(secondes * TAUX)
    for (let k = 0; k < n; k += 1) {
      const t = k / TAUX
      const reste = (n - k) / TAUX
      const a = Math.min(1, t / 0.05) * Math.min(1, reste / 0.25)
      mettre(k, Math.sin(TAU * hauteur * t) * a * 0.14 * force)
    }
  }
}

/* L'accord : trois notes posées ensemble, qui laissent sonner. Deux fois dans
   le film, sur ses deux seules coupes franches. */
function accord(hauteurs, secondes, force = 1) {
  return (mettre) => {
    const n = Math.round(secondes * TAUX)
    for (let k = 0; k < n; k += 1) {
      const t = k / TAUX
      let v = 0
      for (const h of hauteurs) {
        v += Math.sin(TAU * h * t) + Math.sin(TAU * h * 2 * t) * 0.14
      }
      mettre(k, (v / hauteurs.length) * Math.min(1, t / 0.006) * Math.exp(-t / 0.5) * 0.38 * force)
    }
  }
}

/* Le bourdon du voile. Sa coupure suit la force du voile image par image :
   c'est la rampe du film, entendue. Elle part fermée, sur un fichier qu'on ne
   peut pas lire, et s'ouvre jusqu'à l'arrêt. */
function bourdon(images, hauteur, forceA, secondes) {
  return (mettre) => {
    const n = Math.round(secondes * TAUX)
    let bas = 0
    let phase = 0
    let phase2 = 0
    for (let k = 0; k < n; k += 1) {
      const t = k / TAUX
      const image = images + t * C.ips
      const f = forceA(image)
      phase += (TAU * hauteur) / TAUX
      phase2 += (TAU * hauteur * 2.003) / TAUX
      /* Une dent de scie pauvre : trois harmoniques suffisent, le filtre fait
         le reste. */
      const brut =
        (Math.sin(phase) + Math.sin(phase * 2) * 0.5 + Math.sin(phase2 * 1.5) * 0.28) / 1.78
      bas += pole(170 + 2500 * (f / 0.5)) * (brut - bas)
      const reste = (n - k) / TAUX
      const a = Math.min(1, t / 0.4) * Math.min(1, reste / 0.6) * (0.11 + 0.28 * (f / 0.5))
      mettre(k, bas * a)
    }
  }
}

/* --- La partition -----------------------------------------------------------
   Elle se lit dans le conducteur, plan par plan.

   L'ÉQUILIBRE EST MESURÉ, PAS RÉGLÉ À L'OREILLE. Chaque élément a été relevé
   seul, en niveau efficace sur une fenêtre de quatre dixièmes de seconde, et
   les gains ci-dessus viennent de ces relevés : la lame passait six décibels
   au-dessus de la galerie et le bourdon neuf au-dessus de tout le reste, si
   bien que la normalisation en crête était tenue par le seul gonflement du
   voile. Cible : le battement et la lame vers -16 dBFS, la cloche un peu
   au-dessus puisque c'est elle qui porte la mélodie, le bourdon à -13 à son
   plus ouvert, les deux accords à -13 puisque ce sont les deux tournants. */

const TEMPS = C.imagesParTemps

/* La gamme : pentatonique mineure de la, de la3 à la5. Onze notes, aucune
   d'elles ne peut heurter les autres, ce qui est exactement ce qu'on demande à
   une gamme quand les hauteurs viennent d'une mesure et non d'une oreille. */
const GAMME = [220, 261.63, 293.66, 329.63, 392, 440, 523.25, 587.33, 659.26, 784, 880]
const LA1 = 55
const LA2 = 110

function partition(segments) {
  /* Les images retenues par ce montage, dans l'ordre de sortie. */
  const images = segments.flatMap(([a, b]) => Array.from({ length: b - a }, (_, k) => a + k))
  const rang = new Map(images.map((im, k) => [im, k]))
  const piste = new Piste(images.length / C.ips)
  /* Un événement placé à l'image `im` du film ne sonne que si ce montage la
     garde, et il sonne à sa place de sortie. */
  const a = (im, son) => {
    const k = rang.get(im)
    if (k !== undefined) piste.poser(k, son)
  }

  /* La pulsation alterne un temps fort et un temps faible : à force égale sur
     chaque temps, vingt secondes de battement deviennent une mitraille, et les
     cartes de la galerie durent justement deux temps. */
  const battre = (debut, fin, force = 1) => {
    for (let t = debut; t < fin; t += TEMPS) {
      a(t, battement(force * (((t - debut) / TEMPS) % 2 === 0 ? 1 : 0.58)))
    }
  }

  const G = C.galerie
  const fichiers = G.fichiers
  const lum = fichiers.map((f) => f.luminance)
  const [bas, haut] = [Math.min(...lum), Math.max(...lum)]
  /* La hauteur de chaque note sort de la luminance mesurée, et non de son rang :
     deux fichiers proches en clarté donnent deux notes proches. */
  const note = (l) => GAMME[Math.round(((l - bas) / (haut - bas)) * (GAMME.length - 1))]

  /* La presse : trois lames sur trois temps, et le battement une fois sur deux
     pendant qu'elle travaille. */
  for (let k = 0; k < C.presse.lames; k += 1) {
    a(C.presse.depart + k * C.presse.pas, lame(C.presse.duree, 0.9))
  }
  a(0, battement(0.9))
  a(2 * TEMPS, battement(0.9))

  /* Le nom troué : le battement s'installe, la basse entre sous lui. */
  battre(C.nom, C.these)
  a(C.nom, tenue(LA2, (C.these - C.nom) / C.ips + 0.6, 0.8))

  /* La thèse : la première des deux coupes franches, donc le premier accord. */
  a(C.these, accord([LA2, 164.81, 261.63], 2.2))
  battre(C.these, C.demo, 0.85)

  /* La démonstration. La lame amène le fichier, la grille tombe rang par rang,
     puis le battement se retire : pendant les quatre temps de la rampe, il ne
     reste que le bourdon qui s'ouvre. C'est le centre du film, et c'est le seul
     endroit où la pulsation le laisse seul. */
  a(C.demo, lame(C.lameDemo))
  const hauteurs = [2100, 1850, 1620, 1420]
  C.grille.forEach((im, k) => a(im, clic(hauteurs[k], 1 - k * 0.1)))
  battre(C.demo, C.rampe[0], 0.85)
  a(C.verdict, clic(880, 0.7))

  const [rampeA, rampeB] = C.rampe
  const forceVoile = (im) =>
    im < rampeA ? 0 : Math.min(C.heros.force, (im - rampeA) * (C.heros.force / (rampeB - rampeA - 1)))
  a(C.demo, bourdon(C.demo, LA1, forceVoile, (G.depart - C.demo) / C.ips))
  /* L'arrêt de la rampe, quand le verdict passe au vert : une cloche haute,
     et le battement revient avec elle. */
  a(rampeB, cloche(880, 1.6, 1.1))

  /* La galerie : une cloche par fichier, une lame par changement, le battement
     sur chaque temps et la basse dessous. */
  battre(rampeB, C.prix)
  a(rampeB, tenue(LA2, (C.prix - rampeB) / C.ips, 0.7))
  fichiers.forEach((f, k) => {
    const im = G.depart + k * G.pas
    a(im, lame(G.lame, 0.85))
    a(im, cloche(note(f.luminance), 1.4))
  })

  /* Le prix : la seconde coupe franche, le second accord, et plus de battement.
     Le film se referme sur une résonance, pas sur un coup. */
  a(C.prix, accord([LA2, 164.81, 220, 329.63], 1.5, 1.15))
  a(C.prix, tenue(LA1, (images.length - rang.get(C.prix)) / C.ips, 0.9))

  return piste
}

/* --- L'écriture -------------------------------------------------------------
   Une saturation douce sur le bus, puis normalisation en crête à -1,5 dBFS,
   puis un fondu de trente millisecondes aux deux bouts : la bande boucle avec
   l'image, elle ne doit ni claquer à l'entrée ni se couper à la sortie.

   La saturation n'est pas un effet, c'est ce qui rend la bande écoutable :
   sans elle, la crête est tenue par le seul gonflement du bourdon et tout le
   reste vit dix décibels plus bas. Une tangente hyperbolique arrondit les
   crêtes au lieu de les écrêter, et remonte tout ce qui est en dessous. */
const DRIVE = 1.7
const sature = (x) => Math.tanh(DRIVE * x) / Math.tanh(DRIVE)

function ecrire(piste, fichier) {
  let brut = 0
  for (let k = 0; k < piste.n; k += 1) {
    brut = Math.max(brut, Math.abs(piste.g[k]), Math.abs(piste.d[k]))
  }
  const avant = brut > 0 ? 1 / brut : 1
  let crete = 0
  for (let k = 0; k < piste.n; k += 1) {
    piste.g[k] = sature(piste.g[k] * avant)
    piste.d[k] = sature(piste.d[k] * avant)
    crete = Math.max(crete, Math.abs(piste.g[k]), Math.abs(piste.d[k]))
  }
  const gain = crete > 0 ? Math.pow(10, -1.5 / 20) / crete : 1
  const fondu = Math.round(0.03 * TAUX)
  let carre = 0
  const pcm = Buffer.alloc(piste.n * 4)
  for (let k = 0; k < piste.n; k += 1) {
    const bord = Math.min(1, k / fondu, (piste.n - k) / fondu)
    const g = piste.g[k] * gain * bord
    const d = piste.d[k] * gain * bord
    carre += g * g + d * d
    pcm.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(g * 32767))), k * 4)
    pcm.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(d * 32767))), k * 4 + 2)
  }
  const tete = Buffer.alloc(44)
  tete.write('RIFF', 0)
  tete.writeUInt32LE(36 + pcm.length, 4)
  tete.write('WAVEfmt ', 8)
  tete.writeUInt32LE(16, 16)
  tete.writeUInt16LE(1, 20)
  tete.writeUInt16LE(2, 22)
  tete.writeUInt32LE(TAUX, 24)
  tete.writeUInt32LE(TAUX * 4, 28)
  tete.writeUInt16LE(4, 32)
  tete.writeUInt16LE(16, 34)
  tete.write('data', 36)
  tete.writeUInt32LE(pcm.length, 40)
  fs.writeFileSync(fichier, Buffer.concat([tete, pcm]))
  return { crete: 20 * Math.log10(brut), efficace: 10 * Math.log10(carre / (piste.n * 2)) }
}

const encodeur = process.env.FFMPEG_EXE || 'ffmpeg'
const MONTAGES = [
  { nom: 'reel-20s', segments: [[0, C.total]] },
  { nom: 'story-15s', segments: C.segments },
]

for (const { nom, segments } of MONTAGES) {
  const piste = partition(segments)
  const son = path.join(SORTIE, `aplat-bande-son-${nom}.wav`)
  const { crete, efficace } = ecrire(piste, son)

  const film = path.join(SORTIE, `aplat-film-${nom}.mp4`)
  if (!fs.existsSync(film)) {
    console.error(`${path.relative(RACINE, film)} manque. Lance d’abord \`npm run film\`.`)
    process.exit(1)
  }
  const provisoire = path.join(SORTIE, `.${nom}.mp4`)
  const r = spawnSync(encodeur, [
    '-y', '-i', film, '-i', son,
    '-map', '0:v:0', '-map', '1:a:0',
    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
    '-shortest', '-movflags', '+faststart', provisoire,
  ], { stdio: ['ignore', 'ignore', 'pipe'] })
  if (r.status !== 0) {
    console.error(
      `\nLe mixage a échoué avec « ${encodeur} ».\n` +
      (r.stderr ? r.stderr.toString().split('\n').slice(-10).join('\n') : ''),
    )
    process.exit(1)
  }
  fs.renameSync(provisoire, film)
  console.log(
    `${path.relative(RACINE, film)} : ${(piste.n / TAUX).toFixed(0)} s de son, ` +
    `crête avant normalisation ${crete.toFixed(1)} dBFS, ` +
    `niveau efficace ${efficace.toFixed(1)} dBFS`,
  )
}
