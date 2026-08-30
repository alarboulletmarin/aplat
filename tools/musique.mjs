/* Les bandes son des films.
 *
 * Elles ne sont pas choisies, elles sont construites. Chaque film publie son
 * conducteur dans `.social/*.json`, partition comprise : la liste des coups à
 * jouer et l'image où chacun tombe. Cet outil ne connaît aucun film, il ne
 * sait que rendre une partition. Déplacer un plan dans un film déplace donc la
 * note qui tombe dessus, sans que rien ne soit saisi deux fois.
 *
 * POURQUOI LES FABRIQUER PLUTOT QUE LES ACHETER. Une piste de banque ne
 * tombera jamais sur les images qu'un film choisit. Celles-ci ne font que ça.
 * Et comme elles sont synthétisées ici de bout en bout, elles ne peuvent
 * recevoir aucune revendication de droits sur Instagram.
 *
 * CINQ SONS, ET PAS UN DE PLUS, TOUS TENUS. Le battement, sur le temps. Le
 * clic, bref et haut. Le bourdon, dont le filtre s'ouvre selon une courbe que
 * la partition donne. La cloche. L'accord.
 *
 * Il y en avait un sixième, la lame : un balayage de bruit filtré panoramiqué
 * de gauche à droite, qui suivait la lame de l'image. Supprimé. L'idée se
 * défendait sur le papier, le son ne se défendait pas à l'oreille. Rien ne le
 * remplace : les bandes sont entièrement tenues, sans une seule source de
 * bruit sauf les six millisecondes d'attaque du battement.
 *
 * DÉTERMINISTE. Le bruit sort d'un générateur à graine fixe, pas de
 * `Math.random()` : deux exports donnent le même fichier, comme pour l'image.
 * La graine est remise à sa valeur de départ avant chaque montage.
 *
 * Usage : les films d'abord, puis `node tools/musique.mjs`. Les MP4 repartent
 * avec leur son. `FFMPEG_EXE` désigne un encodeur H.264 + AAC.
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ICI = fileURLToPath(new URL('.', import.meta.url))
const RACINE = path.resolve(ICI, '..')
const SORTIE = path.resolve(RACINE, '.social')
const TAUX = 48000

/* Tous les conducteurs présents. Un film sans conducteur n'a pas été tourné :
   on le dit, on ne le devine pas. */
const conducteurs = fs.existsSync(SORTIE)
  ? fs.readdirSync(SORTIE).filter((f) => f.endsWith('.json')).sort()
  : []
if (!conducteurs.length) {
  console.error(
    'Aucun conducteur dans .social. Lance d’abord les films : ce sont eux qui\n' +
    'publient leur partition, et la bande son se construit dessus.',
  )
  process.exit(1)
}

/* --- Les outils du son ------------------------------------------------------
   Rien d'emprunté : quelques oscillateurs, deux filtres à un pôle et des
   enveloppes exponentielles suffisent, et c'est plus honnête qu'une
   bibliothèque pour six sons. */

/* Un générateur à graine fixe : le bruit du film doit être le même à chaque
   export, comme ses pixels. */
let graine = 0
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
  constructor(secondes, ips) {
    this.n = Math.round(secondes * TAUX)
    this.ips = ips
    this.g = new Float32Array(this.n)
    this.d = new Float32Array(this.n)
  }

  /* Poser un son à un instant donné, en images du film. */
  poser(image, rendre) {
    const depart = Math.round((image / this.ips) * TAUX)
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

/* Le bourdon. Sa coupure suit une courbe que la partition donne, entre zéro et
   un. Dans le film de la démonstration, cette courbe est la rampe de voile :
   c'est donc l'argument du film qu'on entend s'ouvrir. Cet outil, lui, ne sait
   pas ce qu'est un voile, et c'est très bien ainsi. */
function bourdon(hauteur, secondes, ouverture) {
  return (mettre) => {
    const n = Math.round(secondes * TAUX)
    let bas = 0
    let phase = 0
    let phase2 = 0
    for (let k = 0; k < n; k += 1) {
      const t = k / TAUX
      const f = Math.max(0, Math.min(1, ouverture(t)))
      phase += (TAU * hauteur) / TAUX
      phase2 += (TAU * hauteur * 2.003) / TAUX
      /* Une dent de scie pauvre : trois harmoniques suffisent, le filtre fait
         le reste. */
      const brut =
        (Math.sin(phase) + Math.sin(phase * 2) * 0.5 + Math.sin(phase2 * 1.5) * 0.28) / 1.78
      bas += pole(170 + 2500 * f) * (brut - bas)
      const reste = (n - k) / TAUX
      const a = Math.min(1, t / 0.4) * Math.min(1, reste / 0.6) * (0.11 + 0.28 * f)
      mettre(k, bas * a)
    }
  }
}

/* --- Le rendu d'une partition -----------------------------------------------

   L'ÉQUILIBRE EST MESURÉ, PAS RÉGLÉ À L'OREILLE. Chaque son a été relevé seul,
   en niveau efficace sur une fenêtre de quatre dixièmes de seconde, et les
   gains ci-dessus viennent de ces relevés. Une fenêtre prise sur un temps où
   deux sons tombent ensemble ne dit rien de l'équilibre entre les deux, et un
   gain réglé dessus est réglé faux.

   Cible, en niveau efficace isolé : le battement à -14, la cloche un peu
   au-dessus puisque c'est elle qui porte la mélodie, le bourdon cinq à six
   décibels au-dessus du battement à son plus ouvert, les accords entre les
   deux. */

const GRAINE = 0x9e3779b9
graine = GRAINE

/* Une courbe affine par morceaux, donnée en points [image, valeur]. C'est
   ainsi que la partition décrit l'ouverture du bourdon, sans que cet outil ait
   à connaître ce qu'est un voile. */
const courbe = (points, x) => {
  if (!points || !points.length) return 1
  if (x <= points[0][0]) return points[0][1]
  for (let k = 1; k < points.length; k += 1) {
    if (x <= points[k][0]) {
      const [x0, y0] = points[k - 1]
      const [x1, y1] = points[k]
      return x1 === x0 ? y1 : y0 + ((y1 - y0) * (x - x0)) / (x1 - x0)
    }
  }
  return points[points.length - 1][1]
}

function fabriquer(m, ips) {
  switch (m.son) {
    case 'battement': return battement(m.force ?? 1)
    case 'clic': return clic(m.hauteur, m.force ?? 1)
    case 'cloche': return cloche(m.hauteur, m.duree ?? 1.4, m.force ?? 1)
    case 'tenue': return tenue(m.hauteur, m.duree, m.force ?? 1)
    case 'accord': return accord(m.hauteurs, m.duree ?? 1.5, m.force ?? 1)
    case 'bourdon': return bourdon(m.hauteur, m.duree, (t) => courbe(m.points, t * ips))
    default: throw new Error(`son inconnu dans la partition : ${m.son}`)
  }
}

/* Rendre un montage. Un événement placé à l'image `im` du film ne sonne que si
   ce montage garde cette image, et il sonne à sa place DE SORTIE : c'est ce
   qui permet à une version courte, dont le raccord tombe sur un temps entier
   des deux côtés, de rester sur sa grille en traversant la coupe. */
function rendre(C, segments) {
  graine = GRAINE
  const images = segments.flatMap(([a, b]) =>
    Array.from({ length: b - a }, (_, k) => a + k))
  const rang = new Map(images.map((im, k) => [im, k]))
  const piste = new Piste(images.length / C.ips, C.ips)
  for (const m of C.partition) {
    const k = rang.get(m.image)
    if (k !== undefined) piste.poser(k, fabriquer(m, C.ips))
  }
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

for (const nomJson of conducteurs) {
  const C = JSON.parse(fs.readFileSync(path.join(SORTIE, nomJson), 'utf8'))
  if (!C.partition || !C.montages) continue
  for (const { nom, segments } of C.montages) {
    const film = path.join(SORTIE, `${nom}.mp4`)
    if (!fs.existsSync(film)) {
      console.error(`${path.relative(RACINE, film)} manque. Retourne le film d’abord.`)
      process.exit(1)
    }
    const piste = rendre(C, segments)
    const son = path.join(SORTIE, `${nom}.wav`)
    const { crete, efficace } = ecrire(piste, son)

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
      `${C.partition.length} coups, crête avant normalisation ${crete.toFixed(1)} dBFS, ` +
      `niveau efficace ${efficace.toFixed(1)} dBFS`,
    )
  }
}
