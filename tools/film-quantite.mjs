/* Le film « 76 ».
 *
 * Dix-huit secondes, 1080 sur 1920, trente images par seconde, calé sur 120
 * battements par minute. Une seule chose à dire : le catalogue est
 * inépuisable, et ça se regarde plutôt que ça ne s'explique.
 *
 * L'IDÉE. Les 76 familles du moteur passent plein cadre, cinq par seconde,
 * sans un mot. Un compteur monte dans le coin. À la fin, les trois nombres.
 *
 * CE QUI REND LE RYTHME TENABLE. Couper cinq fois par seconde en changeant
 * d'image à chaque fois, c'est le stroboscope assuré : au-delà de trois
 * alternances clair-sombre par seconde, on entre dans le domaine de la
 * photosensibilité. Deux règles l'évitent, et aucune n'est un compromis sur
 * la vivacité :
 *
 *   1. une seule palette, tenue du début à la fin. Seule la géométrie change,
 *      jamais la couleur. C'est aussi un meilleur argument : 76 géométries,
 *      pas 76 images au hasard ;
 *   2. les familles sont rangées par la luminance que la sonde leur mesure,
 *      du plus clair au plus sombre. La suite ne clignote pas, elle descend.
 *      Deux images voisines diffèrent alors de moins d'un pour cent de
 *      luminance, et l'oeil ne voit plus des coupes mais un glissement.
 *
 * CE QUI N'EST PAS SAISI À LA MAIN. La liste des familles, leur nombre, leur
 * ordre, et l'encre du compteur, prise des deux encres du produit, celle qui
 * contraste le plus avec les pixels que le compteur recouvre vraiment.
 *
 * MÉMOIRE. Pré-rendre 76 toiles de 1080 sur 1920 coûterait six cents
 * mégaoctets. Chaque famille est donc rendue à la demande, et une seule est
 * gardée : le travail total est le même, la mémoire est constante.
 *
 * Usage : `npm run build`, puis `node tools/film-quantite.mjs`.
 */
import { tourner, IPS, TEMPS, LARGEUR, HAUTEUR } from './pellicule.mjs'

const NOM = 'aplat-film-76-18s'
const PALETTE = 'soleil'
const DEFILE = 450
const TOTAL = 540

function preparer({ palette }) {
  const M = window.MOTEUR
  const F = {}
  window.__f = F

  const CREME = '#F7F3E6'
  const ENCRE = '#17243F'
  const canal = (v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4))
  const lum = (r, g, b) => 0.2126 * canal(r / 255) + 0.7152 * canal(g / 255) + 0.0722 * canal(b / 255)
  const rapport = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
  F.LCREME = lum(247, 243, 230)
  F.LENCRE = lum(23, 36, 63)
  F.CREME = CREME
  F.ENCRE = ENCRE
  F.lum = lum
  F.rapport = rapport

  F.palette = palette
  /* Une seule toile en vie à la fois : pré-rendre 76 images de 1080 sur 1920
     coûterait six cents mégaoctets. */
  F.toile = new OffscreenCanvas(1080, 1920)
  const c = F.toile.getContext('2d', { alpha: false })
  /* La toile est reposée avant chaque famille. Sans ça, une famille qui laisse
     des zones transparentes montre le résidu de la précédente ; comme l'ordre
     de la passe de mesure n'est pas celui de la passe de rendu, l'image mesurée
     n'était alors pas l'image montrée, et le classement par luminance perdait
     sa monotonie. */
  const peindre = (id) => {
    c.fillStyle = M.PALETTES[palette].fond
    c.fillRect(0, 0, 1080, 1920)
    M.dessiner(c, 1080, 1920, { famille: id, palette, densite: 2, graine: 7 }, {})
  }
  /* La luminance moyenne d'une fenêtre de l'image rendue. */
  const mesurerFenetre = (x, y, w, h) => {
    const d = c.getImageData(x, y, w, h).data
    let somme = 0
    for (let j = 0; j < d.length; j += 16) somme += lum(d[j], d[j + 1], d[j + 2])
    return somme / (d.length / 16)
  }

  /* L'ORDRE DU FILM, et c'est lui qui décide si le film est regardable. On
     rend les 76 familles une fois, on relève la luminance moyenne de L'IMAGE
     ENTIÈRE, et on range du plus clair au plus sombre.

     Le premier jet triait sur `mesurer()`, qui répond pour la bande d'icônes
     et non pour l'image : un ciel sombre sous des sommets clairs y passe pour
     un fichier clair. Trié là-dessus, le défilé gardait quatre alternances
     clair-sombre. On mesure donc ce qu'on montre. Au même passage on relève
     l'encre du compteur, sous la fenêtre qu'il recouvre vraiment. */
  F.familles = M.FAMILLES.map((f) => {
    peindre(f.id)
    const L = mesurerFenetre(0, 0, 1080, 1920)
    const sous = mesurerFenetre(96, 1570, 504, 120)
    return {
      ...f,
      luminance: L,
      encre: rapport(sous, F.LCREME) >= rapport(sous, F.LENCRE) ? CREME : ENCRE,
      carton: Math.max(rapport(sous, F.LCREME), rapport(sous, F.LENCRE)),
    }
  }).sort((a, b) => b.luminance - a.luminance)

  F.rendu = -1
  F.encre = ENCRE
  F.montrer = (k) => {
    if (F.rendu !== k) {
      peindre(F.familles[k].id)
      F.encre = F.familles[k].encre
      F.rendu = k
    }
    return F.toile
  }

  return {
    palette,
    familles: F.familles.map((f) => ({ id: f.id, fr: f.fr, luminance: f.luminance, carton: f.carton })),
    nombre: M.FAMILLES.length,
    palettes: Object.keys(M.PALETTES).length,
  }
}

function etat({ i, defile, total, releve }) {
  const M = window.MOTEUR
  const F = window.__f
  const scene = document.getElementById('scene')
  const ctx = scene.getContext('2d', { alpha: false })
  const compteur = document.getElementById('compteur')
  const anton = document.getElementById('anton')
  const pied = document.getElementById('pied')
  compteur.hidden = true
  anton.hidden = true
  pied.hidden = true

  const fi = document.querySelector('.fi')

  /* ---- Le défilé : 76 familles, cinq par seconde ------------------------- */
  if (i < defile) {
    const k = Math.min(F.familles.length - 1, Math.floor((i / defile) * F.familles.length))
    ctx.drawImage(F.montrer(k), 0, 0)
    fi.style.setProperty('--libelle', F.encre)
    compteur.hidden = false
    compteur.innerHTML =
      `${String(k + 1).padStart(2, '0')}<small> / ${F.familles.length}</small>`
    return
  }

  /* ---- Les trois nombres ------------------------------------------------- */
  ctx.fillStyle = M.PALETTES[F.palette].fond
  ctx.fillRect(0, 0, 1080, 1920)
  M.peindreGrain(ctx, 1080, 1920)
  anton.hidden = false
  const lignes = [
    { mot: `${releve.nombre} motifs`, a: defile },
    { mot: `${releve.palettes} palettes`, a: defile + 10 },
    { mot: '99 999 graines', a: defile + 20 },
  ]
  if (anton.dataset.cle !== 'fin') {
    anton.dataset.cle = 'fin'
    anton.innerHTML = lignes.map((l) => `<b>${l.mot}</b>`).join('')
    anton.style.top = '560px'
    anton.querySelectorAll('b').forEach((b) => {
      b.style.fontSize = '100px'
      const portee = document.createRange()
      portee.selectNodeContents(b)
      b.style.fontSize = `${Math.floor((100 * 888) / portee.getBoundingClientRect().width)}px`
      b.style.marginTop = '14px'
    })
  }
  anton.querySelectorAll('b').forEach((b, k) => {
    const t = Math.max(0, Math.min(1, (i - lignes[k].a) / 6))
    b.style.clipPath = `inset(0 ${(1 - 1 + Math.pow(1 - t, 3)) * 100}% 0 0)`
    b.style.color = '#17243F'
  })
  pied.hidden = false
  pied.style.top = '1560px'
  pied.style.color = '#17243F'
  pied.textContent = 'aplat.vercel.app'
}

const corps = `<div class="fi">
  <canvas id="scene" width="${LARGEUR}" height="${HAUTEUR}"></canvas>
  <div class="fi-anton" id="anton" hidden></div>
  <p class="fx-compteur" id="compteur" hidden></p>
  <p class="fi-pied" id="pied" hidden></p>
</div>`

await tourner({
  nom: NOM,
  corps,
  feuilles: ['social.css', 'film.css', 'films.css'],
  images: Array.from({ length: TOTAL }, (_, k) => k),
  preparer,
  etat,
  arguments_: { palette: PALETTE, defile: DEFILE, total: TOTAL },
  dire: (r) => {
    const l = r.familles
    console.log(`palette tenue : ${r.palette}, ${r.nombre} familles rangées par luminance`)
    console.log(`  de ${l[0].fr} (${l[0].luminance.toFixed(3)}) à ` +
      `${l[l.length - 1].fr} (${l[l.length - 1].luminance.toFixed(3)})`)
    const pas = l.slice(1).map((f, k) => Math.abs(f.luminance - l[k].luminance))
    console.log(`  plus grand écart entre deux images voisines : ` +
      `${(Math.max(...pas) * 100).toFixed(1)} % de luminance`)
    console.log(`  compteur : le pire des 76 contrastes vaut ` +
      `${Math.min(...l.map((f) => f.carton)).toFixed(1)}:1 ` +
      `(seuil AA du grand texte : 3:1, le compteur fait 96 px)`)
  },
  conducteur: (r) => ({
    ips: IPS, total: TOTAL, imagesParTemps: TEMPS,
    montages: [{ nom: NOM, segments: [[0, TOTAL]] }],
    defile: DEFILE, familles: r.familles,
    /* La partition. Le défilé est une texture, pas une suite d'événements :
       la pulsation le tient sur le temps, une cloche tous les quatre temps
       marque l'avancée, et l'accord tombe sur les trois nombres. */
    partition: [
      ...Array.from({ length: DEFILE / TEMPS }, (_, k) => ({
        son: 'battement', image: k * TEMPS, force: k % 2 === 0 ? 1 : 0.58,
      })),
      ...Array.from({ length: DEFILE / (TEMPS * 4) }, (_, k) => ({
        son: 'cloche', image: k * TEMPS * 4,
        hauteur: [880, 784, 659.26, 587.33, 523.25, 440, 392, 329.63][k % 8],
        duree: 1.4, force: 0.9,
      })),
      { son: 'tenue', image: 0, hauteur: 110, duree: DEFILE / IPS, force: 0.7 },
      { son: 'accord', image: DEFILE, hauteurs: [110, 164.81, 220, 329.63], duree: 1.6, force: 1.15 },
      { son: 'tenue', image: DEFILE, hauteur: 55, duree: (TOTAL - DEFILE) / IPS, force: 0.9 },
    ],
  }),
})
