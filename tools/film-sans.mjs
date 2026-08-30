/* Le film « Sans ».
 *
 * Quinze secondes, 1080 sur 1920, trente images par seconde, calé sur 120
 * battements par minute. C'est le film le moins aimable du lot, et c'est
 * voulu : il ne séduit pas, il prend position.
 *
 * L'IDÉE. Six choses que l'application ne fait pas, une par carte, trois temps
 * chacune, en coupe franche, sans un motif. Puis les motifs d'un coup, et le
 * nom découpé dedans. La bascule est le film : douze secondes de refus, trois
 * secondes de marchandise.
 *
 * CE QU'IL FAUT SAVOIR SUR CE TON. Six négations à la suite peuvent passer
 * pour de la suffisance. C'est une munition de lancement, pas une vidéo de
 * routine : elle se tient le jour où l'on a le droit d'être frontal.
 *
 * LE CORPS DES MOTS N'EST PAS CHOISI. Chaque nom est mis à l'échelle pour
 * aller d'une marge à l'autre : c'est sa longueur qui décide de sa taille,
 * comme sur les affiches du projet. PUB est donc énorme et ABONNEMENT est
 * petit, et c'est la règle qui le veut, pas une main.
 *
 * L'ORDRE DES APLATS EST MESURÉ. Les six fonds sont rangés par la luminance
 * que leur couleur donne, du plus clair au plus sombre : la suite descend au
 * lieu d'alterner, aucune coupe ne clignote, et le film s'assombrit à mesure
 * que la liste s'allonge. Les motifs qui suivent arrivent donc sur le fond le
 * plus sombre du film, ce qui est exactement l'effet cherché.
 *
 * Usage : `npm run build`, puis `node tools/film-sans.mjs`.
 */
import { tourner, IPS, TEMPS, LARGEUR, HAUTEUR } from './pellicule.mjs'

const NOM = 'aplat-film-sans-15s'
const CARTE = 45
const MOTS = ['compte', 'pub', 'suivi', 'serveur', 'abonnement', 'connexion']
const MOTIFS = [
  { famille: 'agrumes', palette: 'menthe', densite: 1, graine: 3 },
  { famille: 'arcade', palette: 'soleil', densite: 1, graine: 5 },
  { famille: 'penrose', palette: 'ciel', densite: 1, graine: 2 },
  { famille: 'torii', palette: 'corail', densite: 1, graine: 4 },
]
/* Les candidats pour la carte finale. Celui qui est retenu n'est pas choisi
   ici : c'est celui dont l'aplat de fond contraste le plus avec le fichier
   entier, parce que c'est cet écart-là, et lui seul, qui rend le nom découpé
   lisible. Le premier jet prenait truchet/lime, dont le fond et le motif ont
   la même clarté : le nom y était illisible. */
const FINALES = [
  { famille: 'truchet', palette: 'lime', densite: 2, graine: 9 },
  { famille: 'truchet', palette: 'nuit', densite: 2, graine: 9 },
  { famille: 'ecailles', palette: 'encre', densite: 2, graine: 3 },
  { famille: 'azulejos', palette: 'prune', densite: 2, graine: 6 },
  { famille: 'vagues', palette: 'orage', densite: 2, graine: 2 },
  { famille: 'mosaique', palette: 'ardoise', densite: 2, graine: 4 },
  { famille: 'plis', palette: 'nuit', densite: 1, graine: 7 },
]
const DEBUT_MOTIFS = MOTS.length * CARTE
const DEBUT_NOM = DEBUT_MOTIFS + MOTIFS.length * 30
const TOTAL = DEBUT_NOM + 60

function preparer({ mots, motifs, finales }) {
  const M = window.MOTEUR
  const F = {}
  window.__f = F

  const canal = (v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4))
  const lum = (r, g, b) => 0.2126 * canal(r / 255) + 0.7152 * canal(g / 255) + 0.0722 * canal(b / 255)
  const duHex = (h) => lum(
    parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16))
  const rapport = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
  const LCREME = duHex('#F7F3E6')
  const LENCRE = duHex('#17243F')

  /* Les six aplats. On range les onze palettes du plus clair au plus sombre,
     puis on en prend six ESPACÉES sur toute la gamme, et non les six premières :
     prendre les six premières donnait les six plus claires, et le film restait
     clair d'un bout à l'autre alors qu'il doit s'assombrir à mesure que la
     liste s'allonge. Le mot ne choisit pas son fond, c'est le fond qui vient à
     son rang. */
  const rangees = Object.entries(M.PALETTES)
    .map(([id, p]) => ({ id, fond: p.fond, L: duHex(p.fond) }))
    .sort((a, b) => b.L - a.L)
  F.cartes = mots
    .map((_, k) => rangees[Math.round((k * (rangees.length - 1)) / (mots.length - 1))])
    .map((c, k) => ({
      ...c,
      mot: mots[k],
      encre: rapport(c.L, LCREME) >= rapport(c.L, LENCRE) ? '#F7F3E6' : '#17243F',
      contraste: Math.max(rapport(c.L, LCREME), rapport(c.L, LENCRE)),
    }))

  const toile = (peintre) => {
    const c = new OffscreenCanvas(1080, 1920)
    peintre(c.getContext('2d', { alpha: false }))
    return c
  }
  F.motifs = motifs.map((m) => toile((c) => M.dessiner(c, 1080, 1920, m, {})))

  /* La luminance moyenne d'une fenêtre d'une toile. */
  const fenetre = (t, x, y, w, h) => {
    const d = t.getContext('2d').getImageData(x, y, w, h).data
    let somme = 0
    for (let j = 0; j < d.length; j += 16) somme += lum(d[j], d[j + 1], d[j + 2])
    return somme / (d.length / 16)
  }

  /* LE FICHIER DE LA CARTE FINALE, choisi sur la mesure. Le nom est découpé
     dans le fichier : dehors le fichier entier, dedans son seul aplat de fond.
     Ce qui rend les lettres lisibles est donc l'écart entre ces deux-là, et
     rien d'autre. On garde le candidat dont l'écart est le plus grand, mesuré
     sur la bande que le mot recouvre vraiment. */
  const juges = finales.map((m) => {
    const plein = toile((c) => M.dessiner(c, 1080, 1920, m, {}))
    const fond = toile((c) => M.dessiner(c, 1080, 1920, m, { arret: 'fond' }))
    const dehors = fenetre(plein, 96, 760, 888, 360)
    const dedans = fenetre(fond, 96, 760, 888, 360)
    return { m, plein, fond, contraste: rapport(dehors, dedans), dehors, dedans }
  }).sort((a, b) => b.contraste - a.contraste)
  const gagnant = juges[0]
  F.final = gagnant.plein
  F.finalFond = gagnant.fond
  /* L'encre du pied, sur la bande qu'il recouvre. */
  const sousPied = fenetre(gagnant.plein, 96, 1200, 888, 90)
  F.encrePied = rapport(sousPied, LCREME) >= rapport(sousPied, LENCRE) ? '#F7F3E6' : '#17243F'
  F.contrastePied = Math.max(rapport(sousPied, LCREME), rapport(sousPied, LENCRE))

  return {
    cartes: F.cartes.map((c) => ({ mot: c.mot, palette: c.id, contraste: c.contraste })),
    finale: {
      ...gagnant.m, contraste: gagnant.contraste,
      pied: F.contrastePied,
      recales: juges.slice(1).map((j) => `${j.m.famille}/${j.m.palette} ${j.contraste.toFixed(1)}:1`),
    },
  }
}

function etat({ i, carte, debutMotifs, debutNom }) {
  const M = window.MOTEUR
  const F = window.__f
  const scene = document.getElementById('scene')
  const ctx = scene.getContext('2d', { alpha: false })
  const bloc = document.getElementById('carte')
  const filet = document.getElementById('filet')
  const pied = document.getElementById('pied')
  bloc.hidden = true
  filet.hidden = true
  pied.hidden = true

  /* ---- Les six refus ----------------------------------------------------- */
  if (i < debutMotifs) {
    const k = Math.floor(i / carte)
    const c = F.cartes[k]
    ctx.fillStyle = c.fond
    ctx.fillRect(0, 0, 1080, 1920)
    M.peindreGrain(ctx, 1080, 1920)
    filet.hidden = false
    filet.style.color = c.encre
    bloc.hidden = false
    if (bloc.dataset.cle !== c.mot) {
      bloc.dataset.cle = c.mot
      bloc.innerHTML = `<em>Sans</em><b>${c.mot}</b>`
      const b = bloc.querySelector('b')
      b.style.fontSize = '100px'
      const portee = document.createRange()
      portee.selectNodeContents(b)
      /* La largeur décide du corps, mais un mot de trois lettres monterait à
         six cents pixels et sortirait de la série : on plafonne à 460. */
      b.style.fontSize = `${Math.min(460, Math.floor((100 * 888) / portee.getBoundingClientRect().width))}px`
    }
    bloc.style.color = c.encre
    return
  }

  /* ---- Les motifs, d'un coup --------------------------------------------- */
  if (i < debutNom) {
    ctx.drawImage(F.motifs[Math.min(F.motifs.length - 1, Math.floor((i - debutMotifs) / 30))], 0, 0)
    return
  }

  /* ---- Le nom découpé dans le dernier fichier ---------------------------- */
  ctx.drawImage(F.final, 0, 0)
  const masque = new OffscreenCanvas(1080, 1920)
  const mc = masque.getContext('2d')
  mc.drawImage(F.finalFond, 0, 0)
  mc.globalCompositeOperation = 'destination-in'
  let corps = 430
  mc.font = `${corps}px Anton`
  corps = Math.floor(corps * (888 / mc.measureText('APLAT').width))
  mc.font = `${corps}px Anton`
  mc.textBaseline = 'alphabetic'
  mc.fillText('APLAT', 96, 1120)
  ctx.drawImage(masque, 0, 0)
  pied.hidden = false
  pied.style.top = '1200px'
  pied.style.color = F.encrePied
  pied.textContent = 'Gratuit. aplat.vercel.app'
}

const corps = `<div class="fi">
  <canvas id="scene" width="${LARGEUR}" height="${HAUTEUR}"></canvas>
  <div class="fx-filet" id="filet" hidden></div>
  <div class="fx-carte" id="carte" hidden></div>
  <p class="fi-pied" id="pied" hidden></p>
</div>`

await tourner({
  nom: NOM,
  corps,
  feuilles: ['social.css', 'film.css', 'films.css'],
  images: Array.from({ length: TOTAL }, (_, k) => k),
  preparer,
  etat,
  arguments_: {
    mots: MOTS, motifs: MOTIFS, finales: FINALES,
    carte: CARTE, debutMotifs: DEBUT_MOTIFS, debutNom: DEBUT_NOM,
  },
  dire: (r) => {
    console.log('cartes : ' + r.cartes
      .map((c) => `sans ${c.mot} (${c.palette}, ${c.contraste.toFixed(1)}:1)`).join(', '))
    console.log(`carte finale : ${r.finale.famille}/${r.finale.palette}, ` +
      `nom découpé à ${r.finale.contraste.toFixed(1)}:1, pied à ${r.finale.pied.toFixed(1)}:1`)
    console.log(`  recalés : ${r.finale.recales.join(', ')}`)
  },
  conducteur: (r) => ({
    ips: IPS, total: TOTAL, imagesParTemps: TEMPS,
    montages: [{ nom: NOM, segments: [[0, TOTAL]] }],
    cartes: r.cartes, finale: r.finale, debutMotifs: DEBUT_MOTIFS, debutNom: DEBUT_NOM,
    /* La partition. Une carte, un accord : six refus, six coups, rien entre
       eux. Puis la pulsation entre avec les motifs, parce que c'est le moment
       où le film cesse de refuser et se met à montrer. */
    partition: [
      ...MOTS.map((_, k) => ({
        son: 'accord', image: k * CARTE, hauteurs: [110, 164.81, 220],
        duree: 1.4, force: 0.8 + k * 0.05,
      })),
      ...MOTS.map((_, k) => ({ son: 'battement', image: k * CARTE, force: 0.9 })),
      ...Array.from({ length: (TOTAL - DEBUT_MOTIFS) / TEMPS }, (_, k) => ({
        son: 'battement', image: DEBUT_MOTIFS + k * TEMPS, force: k % 2 === 0 ? 1 : 0.58,
      })),
      ...MOTIFS.map((_, k) => ({
        son: 'cloche', image: DEBUT_MOTIFS + k * 30,
        hauteur: [523.25, 587.33, 659.26, 784][k], duree: 1.4, force: 1,
      })),
      { son: 'tenue', image: DEBUT_MOTIFS, hauteur: 110, duree: (TOTAL - DEBUT_MOTIFS) / IPS, force: 0.7 },
      { son: 'accord', image: DEBUT_NOM, hauteurs: [110, 164.81, 220, 329.63], duree: 1.8, force: 1.15 },
    ],
  }),
})
