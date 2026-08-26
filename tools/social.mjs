/* Les cartes 9:16 pour les réseaux sociaux.
 *
 * Huit cartes, deux thèmes, au format exact d'une story Instagram :
 * 1080 sur 1920. Elles se lisent dans l'ordre et racontent une chose chacune,
 * dans la voix du produit : ce que c'est, comment on s'en sert, ce qu'il y a
 * dedans, ce qui sort, ce que personne d'autre ne fait, ce qui ne part pas,
 * ce qui se partage, et par où entrer.
 *
 * Deux règles, prises à la page d'accueil et tenues ici :
 *
 * 1. Aucune capture d'écran d'illustration, aucune image de banque. Chaque
 *    motif visible sort du moteur, calculé au moment du rendu, et chaque
 *    maquette d'appareil est capturée dans l'application qui tourne. Une
 *    carte ne peut donc pas promettre un rendu que l'application ne donne pas.
 * 2. Aucun chiffre recopié. Le nombre de familles, de palettes et de graines
 *    est lu dans le moteur, et le rapport de contraste annoncé par la carte du
 *    voile est celui que la sonde mesure vraiment sur ce motif.
 *
 * Usage : npm run build, puis `node tools/social.mjs`. Les fichiers sortent
 * dans `.social/`. Une adresse différente se passe en argument.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { launch } from './pw.mjs'
import { poser } from './banc.mjs'
import { ouvrir } from './serveur.mjs'

const ICI = fileURLToPath(new URL('.', import.meta.url))
const RACINE = path.resolve(ICI, '..')
const SORTIE = path.resolve(RACINE, '.social')

/* Les arguments : un drapeau de série, et l'adresse publique, celle qu'on
   tape après avoir vu la story. L'adresse est écrite une fois et se retrouve
   au pied de chaque carte.

   `--courte`    les trois stories, dans `.social/trois/`
   `--longue`    les huit stories, dans `.social/huit/`
   `--planche`   les quatre panneaux 4:5, dans `.social/planche/`
   `--mosaique`  les quatre quarts de story 9:16, dans `.social/mosaique/`
   `--manifeste` les deux cartes de texte, français et anglais
   `--affiches`  cinq affiches où le nom et le motif se mêlent
   sans rien     les six séries */
const ARGS = process.argv.slice(2)
const DRAPEAUX = ARGS.filter((a) => a.startsWith('--'))
const ADRESSE = ARGS.find((a) => !a.startsWith('--')) || 'aplat.vercel.app'
const VEUT = (nom) => DRAPEAUX.includes(`--${nom}`)
const TOUTES = ['courte', 'longue', 'planche', 'mosaique', 'manifeste', 'affiches']
const DEMANDEES = TOUTES.filter(VEUT)
const SERIES = DEMANDEES.length ? DEMANDEES : TOUTES

/* Les motifs montrés. Choisis, jamais tirés au sort : la série se refabrique
   à l'identique, et deux exports de la même carte sont le même fichier. Les
   familles et les palettes sont celles du moteur, pas des noms de maquette.

   Le catalogue traverse les huit groupes du moteur, abstraits, pavages,
   volumes, instruments, matières, paysages, lieux et figures, et ses douze
   motifs épuisent les onze palettes : une planche qui ne montrerait qu'un
   groupe mentirait sur l'étendue. */
const OUVERTURE = { famille: 'arcade', palette: 'nuit', densite: 1, graine: 7314 }
/* Le motif de la démonstration du voile : vagues sur Soleil. La sonde y
   choisit des libellés clairs sur un fond clair, pose le voile le plus fort
   qu'elle sache poser, et le rapport annoncé par la carte est celui qu'elle
   mesure au bout. Sans voile, la moitié des libellés disparaît. */
const VOILE = { famille: 'vagues', palette: 'soleil', densite: 1, graine: 7314 }
const PARTAGE = { famille: 'ecailles', palette: 'corail', densite: 1, graine: 4870 }
const PAS = [
  { famille: 'azulejos', palette: 'ciel', densite: 1, graine: 3311 },
  { famille: 'sommets', palette: 'nuit', densite: 1, graine: 815 },
  { famille: 'agrumes', palette: 'menthe', densite: 1, graine: 7726 },
]
const CATALOGUE = [
  { famille: 'arcade', palette: 'soleil', densite: 1, graine: 1204 },
  { famille: 'plis', palette: 'ciel', densite: 1, graine: 3311 },
  { famille: 'sommets', palette: 'nuit', densite: 1, graine: 815 },
  { famille: 'vitrail', palette: 'encre', densite: 1, graine: 6402 },
  { famille: 'truchet', palette: 'lime', densite: 1, graine: 2790 },
  { famille: 'horizon', palette: 'corail', densite: 1, graine: 5518 },
  { famille: 'kintsugi', palette: 'argile', densite: 1, graine: 941 },
  { famille: 'agrumes', palette: 'menthe', densite: 1, graine: 7726 },
  { famille: 'persiennes', palette: 'orage', densite: 1, graine: 3095 },
  { famille: 'drape', palette: 'prune', densite: 1, graine: 1663 },
  { famille: 'mire', palette: 'ardoise', densite: 1, graine: 4870 },
  { famille: 'torii', palette: 'soleil', densite: 1, graine: 2231 },
]
const FORMATS = [
  { cle: 'telephone', mot: 'Téléphone', l: 1179, h: 2556, motif: { famille: 'persiennes', palette: 'orage', densite: 1, graine: 3095 } },
  { cle: 'tablette', mot: 'Tablette', l: 2048, h: 2732, motif: { famille: 'vitrail', palette: 'encre', densite: 1, graine: 6402 } },
  { cle: 'ordinateur', mot: 'Ordinateur', l: 2560, h: 1440, motif: { famille: 'nuages', palette: 'ciel', densite: 1, graine: 2048 } },
]
const CLOTURE = { famille: 'truchet', palette: 'lime', densite: 1, graine: 2790 }

const TELEPHONE = '1179x2556'

/* --- Les mots ------------------------------------------------------------- */

const e = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Un entier à la française : 99 999, pas 99999. Espace insécable. */
const nb = (n) => n.toLocaleString('fr-FR').replace(/ | /g, ' ')

/** Une résolution telle que l'application l'écrit. */
const res = (l, h) => `${nb(l)} × ${nb(h)} px`

/* --- Les morceaux de carte ------------------------------------------------ */

const HAUTEURS = ['100%', '62%', '86%', '50%', '74%']
const COULEURS = [
  'var(--encre)', 'var(--encre)', 'var(--lime)', 'var(--encre)',
  'var(--deco-1)', 'var(--encre)', 'var(--deco-2)',
]

/* La planche : quatre images de 1080 sur 1350, en deux colonnes et deux
   rangées. Le pas de la frise est celui de la feuille, barre plus écart, et
   la coupe est une droite tracée dans les coordonnées de la planche. */
const PLANCHE = { largeur: 1080, hauteur: 1350, colonnes: 2 }
const PAS_FRISE = 58
const COUPE_PLANCHE = { gauche: 230, droite: 60 }

/* La mosaïque : quatre quarts de story. Ils sont dessinés à la taille où ils
   seront vus, 540 sur 960, et exportés au double. */
const MOSAIQUE = { largeur: 540, hauteur: 960, colonnes: 2 }
const PAS_FRISE_MOSAIQUE = 29
const COUPE_MOSAIQUE = { gauche: 118, droite: 34 }

/** La frise, reprise à la phase où l'image d'à côté l'a laissée. */
function frisePhase(x, pas, nombre = 21) {
  const debut = Math.floor(x / pas)
  const decalage = debut * pas - x
  let barres = ''
  for (let i = 0; i < nombre; i += 1) {
    const n = debut + i
    barres += `<i style="height:${HAUTEURS[n % HAUTEURS.length]};background:${COULEURS[n % COULEURS.length]}"></i>`
  }
  return `<div class="st-frise-cadre"><div class="frise st-frise" style="margin-left:${decalage}px">${barres}</div></div>`
}

/** Les deux ordonnées de la coupe, pour une colonne d'un gabarit donné. */
function coupeEntre(colonne, gabarit, bornes) {
  const total = gabarit.largeur * gabarit.colonnes
  const y = (x) => bornes.gauche + ((bornes.droite - bornes.gauche) * x) / total
  const x0 = colonne * gabarit.largeur
  return { g: Math.round(y(x0)), d: Math.round(y(x0 + gabarit.largeur)) }
}

const frisePlanche = (colonne) => frisePhase(colonne * PLANCHE.largeur, PAS_FRISE)
const coupePlanche = (colonne) => coupeEntre(colonne, PLANCHE, COUPE_PLANCHE)
const friseMosaique = (colonne) => frisePhase(colonne * MOSAIQUE.largeur, PAS_FRISE_MOSAIQUE)
const coupeMosaique = (colonne) => coupeEntre(colonne, MOSAIQUE, COUPE_MOSAIQUE)

/** La frise d'arches de la page d'accueil, telle quelle. */
function frise(decalage = 0) {
  /* Lu comme un entier, et non pris tel quel : le rang d'une carte arrive
     sous forme de texte, et l'addition le concaténait. « 01 » se coerçait en
     nombre par accident, « 1- » donnait NaN, donc des barres sans hauteur,
     donc une frise invisible. */
  const pas = Number.parseInt(decalage, 10) || 0
  let barres = ''
  for (let i = 0; i < 22; i += 1) {
    barres += `<i style="height:${HAUTEURS[(i + pas) % HAUTEURS.length]};background:${COULEURS[(i + pas) % COULEURS.length]}"></i>`
  }
  return `<div class="frise st-frise">${barres}</div>`
}

/** Un rendu du moteur, peint au chargement de la carte. */
function toile(motif, largeur = 0, hauteur = 0) {
  const cible = largeur ? ` data-res="${largeur}x${hauteur}"` : ''
  return `<canvas class="st-toile" data-motif='${JSON.stringify(motif)}'${cible}></canvas>`
}

/* Une vignette de la démonstration du voile : le motif, et par-dessus la
   grille de libellés du produit, avec ses classes et ses jetons. Le même
   motif des deux côtés, la même graine, la même couleur de libellé : seule
   la couche de voile change, sinon la comparaison montrerait deux
   différences et n'en démontrerait aucune. */
function cote(motif, voile, mot) {
  const applications = ['Appareil', 'Notes', 'Cartes', 'Musique']
  const jetons = JSON.stringify({ ...motif, l: 1179, h: 2556 })
  return `<figure class="st-voile-cote${voile ? ' st-voile-actif' : ''}">
      <div class="voile-boite${voile ? ' voile-boite-active' : ''}" data-jetons='${jetons}'>
        <canvas class="voile-toile" data-motif='${JSON.stringify(motif)}' data-res="1179x2556"${voile ? '' : ' data-voile="0"'}></canvas>
        <div class="voile-grille">
          ${applications.map((nom, i) => `<span class="voile-app"><span class="voile-app-i" data-rayon="${i}"></span><span class="voile-app-t">${nom}</span></span>`).join('')}
        </div>
      </div>
      <figcaption class="st-voile-mot">${mot}</figcaption>
    </figure>`
}

/** Les mégapixels d'un format, tels que la barre d'action les compte. */
function mpx(l, h) {
  return ((l * h) / 1e6).toFixed(1).replace('.', ',')
}

function tete(rang) {
  return `<header class="st-tete">
      <span class="marque"><i></i><b></b></span>
      <span class="st-mot">Aplat</span>
    </header>${frise(rang)}`
}

function pied(mention, inverse = false, adresse = true, sondeMotif = null) {
  const sonde = sondeMotif
    ? ` data-sonde='${JSON.stringify({ ...sondeMotif, l: 1080, h: 1920 })}'`
    : ''
  return `<footer class="st-pied${inverse ? ' st-inverse' : ''}"${sonde}>
      ${adresse ? `<span class="st-url">${e(ADRESSE)}</span>` : '<span></span>'}
      <span class="st-mention">${mention}</span>
    </footer>`
}

/* --- La série longue : huit cartes ---------------------------------------- */

function serieLongue(donnees) {
  const { familles, palettes, graines, densites, contraste, niveau, appareil } = donnees

  return [
    {
      cle: '01-ouverture',
      classe: 'st-un',
      entete: frise(1),
      corps: `
        <p class="st-surtitre">Fonds d’écran génératifs</p>
        <div class="st-nom-bloc">
          <span class="marque" aria-hidden="true"><i></i><b></b></span>
          <h1 class="st-nom">Aplat</h1>
        </div>
        <p class="st-accroche">Un motif, une palette, une densité. Calculé dans ton navigateur, téléchargé en pleine résolution.</p>
        <div class="st-un-ecran"><img class="st-appareil" src="${appareil}" alt=""></div>`,
      mention: 'Sans compte,<br>sans réseau',
    },

    {
      cle: '02-mode-emploi',
      classe: 'st-deux',
      corps: `
        <p class="st-surtitre">Comment ça marche</p>
        <h2 class="st-titre">3 choix,<br>un PNG</h2>
        <p class="st-p st-p-large">Un seul écran, sans onglet ni étape&nbsp;: les réglages et l’aperçu sont côte à côte, tu ne règles jamais à l’aveugle.</p>
        <div class="st-pas-liste">
          <div class="st-pas st-pas-un">
            <div class="st-pas-toile">${toile(PAS[0], 1179, 2556)}</div>
            <div class="st-pas-mots">
              <span class="st-pas-n">01</span>
              <p class="st-pas-t">Tu règles 3 choses</p>
              <p class="st-pas-p">Une famille de motif, une palette, une densité. Ou «&nbsp;Surprends-moi&nbsp;», qui tire les 3.</p>
            </div>
          </div>
          <div class="st-pas st-pas-deux">
            <div class="st-pas-toile">${toile(PAS[1], 1179, 2556)}</div>
            <div class="st-pas-mots">
              <span class="st-pas-n">02</span>
              <p class="st-pas-t">Tu vois le résultat</p>
              <p class="st-pas-p">Le motif s’affiche derrière une vraie grille d’icônes, avant de télécharger et non après.</p>
            </div>
          </div>
          <div class="st-pas st-pas-trois">
            <div class="st-pas-toile">${toile(PAS[2], 1179, 2556)}</div>
            <div class="st-pas-mots">
              <span class="st-pas-n">03</span>
              <p class="st-pas-t">Tu télécharges</p>
              <p class="st-pas-p">Un PNG à la taille exacte de ton écran, dans ta pellicule. 15 secondes.</p>
            </div>
          </div>
        </div>`,
      mention: '1 écran,<br>0 tutoriel',
    },

    {
      cle: '03-catalogue',
      classe: 'st-trois',
      corps: `
        <p class="st-surtitre">Le catalogue</p>
        <h2 class="st-titre st-titre-serre">${familles} motifs,<br>${palettes} palettes</h2>
        <ul class="st-chiffres">
          <li class="st-chiffre"><span class="st-chiffre-n">${familles}</span><span class="st-chiffre-m">familles de motif</span></li>
          <li class="st-chiffre"><span class="st-chiffre-n">${palettes}</span><span class="st-chiffre-m">palettes</span></li>
          <li class="st-chiffre"><span class="st-chiffre-n">${densites}</span><span class="st-chiffre-m">densités</span></li>
          <li class="st-chiffre"><span class="st-chiffre-n">${nb(graines)}</span><span class="st-chiffre-m">graines</span></li>
        </ul>
        <p class="st-p st-p-large">La graine redessine le même motif autrement. Tu peux changer d’avis 1 000 fois&nbsp;: tu ne retomberas pas 2 fois sur la même image par hasard.</p>
        <div class="st-grille-boite">
          <div class="st-grille">
            ${CATALOGUE.map((m) => `<div>${toile(m, 1179, 2556)}</div>`).join('')}
          </div>
        </div>`,
      mention: '12 rendus vrais,<br>calculés dans cette image',
    },

    {
      cle: '04-resolution',
      classe: 'st-quatre',
      corps: `
        <p class="st-surtitre">Le fichier</p>
        <h2 class="st-titre">Le pixel exact<br>de ton écran</h2>
        <p class="st-p st-p-large">Ta résolution est détectée toute seule, ou tu la saisis. L’image est calculée à cette taille&nbsp;: elle n’est ni agrandie, ni rognée.</p>
        <div class="st-puces">
          <span class="st-puce">Détectée à l’ouverture</span>
          <span class="st-puce">Ou saisie, de 16 à 8000 px</span>
          <span class="st-puce st-puce-pleine">PNG, jusqu’à 40 Mpx</span>
        </div>
        <div class="st-formats-boite">
          ${FORMATS.map((f) => `
            <div class="st-format">
              <div class="st-format-vue"><div class="st-cadre" style="width:${Math.round(190 * f.l / f.h)}px">${toile(f.motif, f.l, f.h)}</div></div>
              <div class="st-format-mots">
                <p class="st-format-t">${f.mot}</p>
                <p class="st-format-r">${res(f.l, f.h)}</p>
              </div>
              <p class="st-format-mpx">${mpx(f.l, f.h)}<span> Mpx</span></p>
            </div>`).join('')}
        </div>`,
      mention: '3 préréglages,<br>ou la tienne',
    },

    {
      cle: '05-voile',
      classe: 'st-cinq',
      corps: `
        <p class="st-surtitre">La lisibilité</p>
        <h2 class="st-titre">Tes libellés<br>restent lisibles</h2>
        <p class="st-p st-p-large">Aplat mesure le contraste sous la grille d’icônes, puis pose un voile, juste ce qu’il faut. Même motif, même graine, même couleur de libellé&nbsp;: seul le voile change d’une vignette à l’autre. Il est calculé dans le fichier, pas ajouté à l’aperçu.</p>
        <div class="st-cinq-boite">
          <div class="st-voile">
            ${cote(VOILE, false, 'sans voile')}
            ${cote(VOILE, true, 'voile automatique')}
          </div>
          <p class="st-verdict"><i></i>Lisibilité ${niveau}, ${contraste}:1</p>
          <p class="st-verdict-note">Le rapport mesuré est affiché en permanence, pas seulement quand ça coince. Et quand il reste juste, l’app le dit au lieu de le taire.</p>
        </div>`,
      mention: '4,5:1,<br>le seuil AA',
    },

    {
      cle: '06-rien-ne-sort',
      classe: 'st-six',
      corps: `
        <p class="st-surtitre">Ce qui reste chez toi</p>
        <h2 class="st-titre">Rien ne<br>sort d’ici</h2>
        <p class="st-p st-p-large">Ce n’est pas une intention, c’est la façon dont l’app est faite&nbsp;: il n’y a pas de serveur à qui parler.</p>
        <div class="st-preuves">
          <div class="st-preuve">
            <p class="st-preuve-t">Aucun compte, aucun serveur</p>
            <p class="st-preuve-p">Le pixel est calculé sur ton appareil, puis oublié. La page a interdiction d’émettre&nbsp;: c’est écrit dans sa politique de sécurité.</p>
            <span class="st-code">connect-src 'none'</span>
          </div>
          <div class="st-preuve">
            <p class="st-preuve-t">Aucune mesure d’audience</p>
            <p class="st-preuve-p">Ni traceur, ni cookie, ni pub, ni bandeau à refuser. Personne ne sait que tu es passé, à commencer par nous.</p>
          </div>
          <div class="st-preuve">
            <p class="st-preuve-t">Ce qui reste sur l’appareil</p>
            <p class="st-preuve-p">Les 10 derniers motifs, et rien d’autre&nbsp;: 4 réglages chacun, ni image ni identifiant, effaçables d’un bouton.</p>
          </div>
          <div class="st-preuve">
            <p class="st-preuve-t">Installable, et hors ligne</p>
            <p class="st-preuve-p">Une fois ouverte, l’app s’installe et continue de calculer sans réseau. En avion aussi.</p>
          </div>
        </div>`,
      mention: 'Libre,<br>AGPL-3.0',
    },

    {
      cle: '07-graine',
      classe: 'st-sept',
      corps: `
        <p class="st-surtitre">Le partage</p>
        <h2 class="st-titre">Une graine,<br>un lien</h2>
        <p class="st-p st-p-large">Le lien porte tes 4 réglages, rien d’autre. Il rend exactement la même image, sur n’importe quel appareil.</p>
        <div class="st-sept-boite">
          <span class="st-lien"><span class="st-lien-douce">${e(ADRESSE)}/app?</span>m=${PARTAGE.famille}<span class="st-lien-douce">&amp;</span>p=${PARTAGE.palette}<span class="st-lien-douce">&amp;</span>d=${PARTAGE.densite}<span class="st-lien-douce">&amp;</span>s=${PARTAGE.graine}</span>
          <div class="st-fleche"><i></i></div>
          <div class="st-sept-toile">${toile(PARTAGE, 1179, 2556)}</div>
        </div>`,
      mention: 'Écailles, palette corail,<br>graine ' + PARTAGE.graine,
    },

    {
      cle: '08-appel',
      classe: 'st-huit st-final',
      corps: `
        <p class="st-surtitre">À toi</p>
        <h2 class="st-titre">Prends<br>une graine</h2>
        <p class="st-accroche">3 choix, un clic, un PNG. Ton fond d’écran est à 15 secondes.</p>
        <div class="st-huit-appel">
          <div class="st-bande">${toile(CLOTURE, 2560, 1440)}</div>
          <span class="st-appel">Générer mon fond d’écran</span>
        </div>`,
      mention: 'Gratuit, sans compte,<br>sans pub',
    },
  ]
}

/* --- La série courte : trois cartes -----------------------------------------
 *
 * Trois stories ne sont pas huit stories dont on aurait retiré cinq. La
 * série longue déroule un argument par carte ; celle-ci n'a que trois temps,
 * et chacun doit tenir seul :
 *
 * 1. Ce que c'est, montré et non décrit. C'est la carte qui décide si la
 *    suivante sera vue : le produit y est en entier, motif derrière de
 *    vraies icônes, et la phrase qui lève l'objection est au pied.
 * 2. Ce qu'il y a dedans. Douze rendus valent mieux qu'une promesse
 *    d'abondance, et le soin se prouve par le chiffre que la sonde mesure.
 * 3. Ce qu'on fait maintenant. Un seul geste, et rien d'autre sur la carte.
 *
 * Ce qui saute, et pourquoi : la démonstration du voile côte à côte, qui
 * réclame la moitié d'une carte pour se lire, réduite ici à sa mesure ; le
 * mode d'emploi en trois temps, dont la carte 3 dit déjà le résultat ; le
 * détail de la résolution, du partage et de la vie privée, résumés en une
 * ligne chacun là où ils portent le plus.
 */
function serieCourte(donnees) {
  const { familles, palettes, densites, graines, contraste, niveau, appareil } = donnees

  return [
    {
      cle: '01-produit',
      classe: 'st-un',
      entete: frise(1),
      corps: `
        <p class="st-surtitre">Fonds d’écran génératifs</p>
        <div class="st-nom-bloc">
          <span class="marque" aria-hidden="true"><i></i><b></b></span>
          <h1 class="st-nom">Aplat</h1>
        </div>
        <p class="st-accroche">Un motif, une palette, une densité. Calculé dans ton navigateur, téléchargé en pleine résolution.</p>
        <div class="st-un-ecran"><img class="st-appareil" src="${appareil}" alt=""></div>`,
      mention: 'Gratuit, sans compte,<br>sans pub, sans traceur',
    },

    /* La seule carte coupée de la série. Le fond bascule dans l'autre thème
       sur une diagonale, et les douze vignettes ne bougent pas d'un pixel :
       c'est ce que dit la carte sans l'écrire, le décor change, le motif non.
       La coupe est franche, sans trait ni ombre : du papier découpé, ce que
       la direction artistique fait déjà partout ailleurs. */
    {
      cle: '02-dedans',
      classe: 'st-catalogue',
      coupe: true,
      corps: `
        <p class="st-surtitre">Ce qu’il y a dedans</p>
        <h2 class="st-titre">${familles} motifs</h2>
        <div class="st-dessous st-inverse">
          <p class="st-p st-p-large">${palettes} palettes, ${densites} densités et ${nb(graines)} graines par-dessus&nbsp;: tu ne retomberas pas 2 fois sur la même image par hasard.</p>
          <div class="st-grille">
            ${CATALOGUE.map((m) => `<div>${toile(m, 1179, 2556)}</div>`).join('')}
          </div>
          <div class="st-mesure">
            <p class="st-verdict"><i></i>Et sous tes icônes&nbsp;: ${contraste}:1, lisibilité ${niveau}</p>
            <p class="st-verdict-note">Mesuré sous la grille d’icônes, affiché en permanence dans l’app.</p>
          </div>
        </div>`,
      mention: '12 rendus vrais,<br>calculés dans cette image',
    },

    {
      cle: '03-appel',
      classe: 'st-final',
      corps: `
        <p class="st-surtitre">En 15 secondes</p>
        <h2 class="st-titre">Prends<br>une graine</h2>
        <p class="st-accroche">3 choix, un clic, un PNG à la taille exacte de ton écran.</p>
        <div class="st-puces">
          <span class="st-puce">Aucun compte</span>
          <span class="st-puce">Aucun envoi</span>
          <span class="st-puce st-puce-pleine">Marche hors ligne</span>
        </div>
        <div class="st-huit-appel">
          <div class="st-bande st-bande-courte">${toile(CLOTURE, 2560, 1440)}</div>
          <span class="st-appel">Générer mon fond d’écran</span>
        </div>`,
      mention: 'Libre,<br>AGPL-3.0',
    },
  ]
}

/* --- La planche : quatre panneaux qui tiennent seuls et se recousent --------
 *
 * L'argument se lit en Z, comme on lit une planche : ce que c'est, combien il
 * y en a, pourquoi c'est bien fait, comment l'avoir. Chaque panneau porte son
 * bloc entier, si bien qu'une image publiée seule ne montre jamais une phrase
 * coupée en deux.
 *
 * Ce qui traverse les coutures est le fond, et lui seul : la frise du haut
 * reprend sa phase d'une image à l'autre, la coupe du bas continue sa pente,
 * et la rangée du haut est claire quand celle du bas est sombre, ce qui est la
 * bascule de thème du produit à l'échelle de la planche.
 *
 * Un dernier fil, plus discret : la première vignette de la planche B est
 * exactement le motif que le téléphone de A affiche, même famille, même
 * palette, même graine.
 */
function seriePlanche(donnees) {
  const { familles, palettes, densites, graines, contraste, niveau, appareil } = donnees
  const planche = CATALOGUE.slice(0, 11)

  return [
    {
      cle: 'a-produit',
      theme: 'clair',
      classe: 'st-planche st-pa',
      entete: frisePlanche(0),
      corps: `
        <p class="st-surtitre">Fonds d’écran génératifs</p>
        <div class="st-nom-bloc">
          <span class="marque" aria-hidden="true"><i></i><b></b></span>
          <h1 class="st-nom">Aplat</h1>
        </div>
        <p class="st-accroche">Un motif, une palette, une densité. Calculé dans ton navigateur, téléchargé en pleine résolution.</p>
        <div class="st-pa-ecran"><img class="st-appareil" src="${appareil}" alt=""></div>`,
      mention: 'Gratuit, sans compte,<br>sans réseau',
    },

    {
      cle: 'b-catalogue',
      theme: 'clair',
      classe: 'st-planche st-pb',
      entete: frisePlanche(1),
      corps: `
        <p class="st-surtitre">Le catalogue</p>
        <h2 class="st-titre">${familles} motifs</h2>
        <p class="st-p st-p-large">${palettes} palettes, ${densites} densités et ${nb(graines)} graines par-dessus&nbsp;: tu ne retomberas pas 2 fois sur la même image par hasard.</p>
        <div class="st-pb-boite">
          <div class="st-grille">
            ${[OUVERTURE, ...planche].map((m) => `<div>${toile(m, 1179, 2556)}</div>`).join('')}
          </div>
        </div>`,
      mention: '12 rendus vrais,<br>calculés dans cette image',
      sansAdresse: true,
    },

    {
      cle: 'c-lisibilite',
      theme: 'sombre',
      classe: 'st-planche st-planche-bas st-pc',
      entete: '',
      coupe: 'haut',
      coupeXY: coupePlanche(0),
      corps: `
        <p class="st-surtitre">La lisibilité</p>
        <h2 class="st-titre">Tes libellés<br>restent lisibles</h2>
        <p class="st-p st-p-large">Le contraste est mesuré sous la grille d’icônes, et le voile posé juste ce qu’il faut. Même motif, même graine&nbsp;: seul le voile change.</p>
        <div class="st-pc-boite">
          <div class="st-voile">
            ${cote(VOILE, false, 'sans voile')}
            ${cote(VOILE, true, 'voile automatique')}
          </div>
          <p class="st-verdict"><i></i>Lisibilité ${niveau}, ${contraste}:1</p>
        </div>`,
      mention: 'Le voile est dans le fichier,<br>pas seulement dans l’aperçu',
      sansAdresse: true,
    },

    {
      cle: 'd-appel',
      theme: 'sombre',
      classe: 'st-planche st-planche-bas st-final st-pd',
      entete: '',
      coupe: 'haut',
      coupeXY: coupePlanche(1),
      corps: `
        <p class="st-surtitre">En 15 secondes</p>
        <h2 class="st-titre">Prends<br>une graine</h2>
        <p class="st-accroche">3 choix, un clic, un PNG à la taille exacte de ton écran.</p>
        <div class="st-pd-boite">
          <div class="st-pd-bande">${toile(CLOTURE, 2560, 1440)}</div>
          <span class="st-appel">Générer mon fond d’écran</span>
        </div>`,
      mention: 'Libre,<br>AGPL-3.0',
    },
  ]
}

/* --- Les affiches : cinq façons de mêler le nom et le motif -----------------
 *
 * Le motif n'illustre plus le propos, il le porte : il remplit les lettres,
 * il couvre l'image entière, il habite les arches. Cinq pistes distinctes,
 * à garder ou à jeter, plutôt qu'une seule à défendre.
 */
function serieAffiches(donnees) {
  const { familles, palettes } = donnees
  const sonde = (m) => JSON.stringify({ ...m, l: 1080, h: 1920 })
  const nom = (m) => JSON.stringify(m)

  /* Les cinq motifs des arches, un par lettre. */
  const ARCHES = [
    { lettre: 'A', motif: { famille: 'arcade', palette: 'corail', densite: 1, graine: 1204 } },
    { lettre: 'P', motif: { famille: 'azulejos', palette: 'ciel', densite: 1, graine: 3311 } },
    { lettre: 'L', motif: { famille: 'truchet', palette: 'lime', densite: 1, graine: 2790 } },
    { lettre: 'A', motif: { famille: 'ecailles', palette: 'ardoise', densite: 1, graine: 4870 } },
    { lettre: 'T', motif: { famille: 'vitrail', palette: 'soleil', densite: 1, graine: 6402 } },
  ]

  const FOND = { famille: 'arcade', palette: 'nuit', densite: 1, graine: 7314 }
  const GRAINE = { famille: 'vagues', palette: 'corail', densite: 1, graine: 4870 }

  return [
    /* 01. Le nom rempli de motif. Trois fois le même mot, trois motifs
       différents : c'est la promesse du produit dite en une image. */
    {
      cle: '1-mot-rempli',
      theme: 'clair',
      classe: 'st-affiche st-af-un',
      entete: '',
      corps: `
        <div class="st-affiche-mots">
          <span class="st-mot st-mot-motif" data-ajuste data-remplissage='${nom({ famille: 'arcade', palette: 'soleil', densite: 1, graine: 1204 })}'>Aplat</span>
          <span class="st-mot st-mot-motif" data-ajuste data-remplissage='${nom({ famille: 'vitrail', palette: 'encre', densite: 1, graine: 6402 })}'>Aplat</span>
          <span class="st-mot st-mot-motif" data-ajuste data-remplissage='${nom({ famille: 'sommets', palette: 'nuit', densite: 1, graine: 815 })}'>Aplat</span>
        </div>
        <p class="st-affiche-note">Fonds d’écran génératifs. ${familles} motifs, ${palettes} palettes, et le mot rempli de 3 d’entre eux.</p>`,
      mention: 'Chaque lettre est<br>un rendu du moteur',
    },

    /* 02. Le nom posé sur un vrai fond d'écran, à la couleur que la sonde
       donne aux libellés. L'affiche démontre ce que l'app promet. */
    {
      cle: '2-mot-sur-fond',
      theme: 'clair',
      classe: 'st-affiche st-af-deux',
      entete: '',
      corps: `
        <div class="st-affiche-centre" data-sonde='${sonde(FOND)}'>
          <span class="st-mot" data-ajuste>Aplat</span>
          <p class="st-legende">Arcade, palette nuit <span>/ graine ${FOND.graine}</span></p>
        </div>`,
      fond: `<div class="st-fond"><canvas data-motif='${nom(FOND)}' data-res="1080x1920"></canvas></div>`,
      mention: 'Le mot prend la couleur<br>que la sonde lui donne',
      piedSonde: FOND,
    },

    /* 03. Cinq arches, cinq motifs, cinq lettres. La forme de la marque,
       en colonnade, et le nom dedans. */
    {
      cle: '3-arches',
      theme: 'clair',
      classe: 'st-affiche st-af-trois',
      entete: '',
      corps: `
        <p class="st-surtitre">Une lettre, un motif</p>
        <div class="st-arches">
          ${ARCHES.map((a) => `
            <div class="st-arche">
              <canvas data-motif='${nom(a.motif)}' data-res="1179x2556"></canvas>
              <span data-sonde='${JSON.stringify({ ...a.motif, l: 1179, h: 2556 })}'>${a.lettre}</span>
            </div>`).join('')}
        </div>`,
      mention: '5 familles,<br>5 palettes',
    },

    /* 04. La graine, en géant, sur le motif qu'elle dessine. Le seul chiffre
       du produit qui se voit, et le seul qui change tout. */
    {
      cle: '4-graine',
      theme: 'clair',
      classe: 'st-affiche st-af-quatre',
      entete: '',
      corps: `
        <div class="st-affiche-centre" data-sonde='${sonde(GRAINE)}'>
          <span class="st-mot" data-ajuste>${GRAINE.graine}</span>
          <p class="st-legende">La graine <span>/ change-la, le motif se redessine</span></p>
        </div>`,
      fond: `<div class="st-fond"><canvas data-motif='${nom(GRAINE)}' data-res="1080x1920"></canvas></div>`,
      mention: '99 999 graines,<br>et celle-ci en est une',
      piedSonde: GRAINE,
    },

    /* 05. Vingt motifs plein cadre, et le nom posé en aplat par-dessus. */
    {
      cle: '5-planche',
      theme: 'clair',
      classe: 'st-affiche st-af-cinq',
      entete: '',
      fond: `<div class="st-planche-pleine">${Array.from({ length: 20 }, (_, i) => {
        const m = CATALOGUE[i % CATALOGUE.length]
        return `<canvas data-motif='${JSON.stringify({ ...m, graine: m.graine + i * 37 })}' data-res="1179x2556"></canvas>`
      }).join('')}</div>`,
      corps: `
        <div class="st-bandeau">
          <span class="st-mot" data-ajuste>Aplat</span>
          <p><span>Fonds d’écran génératifs</span><span>${e(ADRESSE)}</span></p>
        </div>`,
    },
  ]
}

/* --- Le manifeste : deux cartes de texte, en deux langues --------------------
 *
 * Ce sont les seules cartes de la série où le texte est le sujet et non le
 * commentaire d'une image. Le français porte, l'anglais suit sous un filet :
 * même contenu, deux poids, jamais deux colonnes. La bande de motifs en bas
 * dit ce dont la phrase parle, et elle sort par les deux bords.
 */
function serieManifeste() {
  const trad = (en) => `
        <div class="st-trad">
          <span class="st-trad-code" lang="en">EN</span>
          <p class="st-trad-texte" lang="en">${en}</p>
        </div>`
  const bande = (motifs) =>
    `<div class="st-bande-motifs">${motifs.map((m) => `<div>${toile(m, 1179, 2556)}</div>`).join('')}</div>`

  return [
    {
      cle: '1-produit',
      classe: 'st-manifeste',
      corps: `
        <h2 class="st-titre">Fonds d’écran<br>génératifs</h2>
        <p class="st-dit">Entièrement calculés dans votre navigateur, exportés à la résolution exacte de votre appareil.</p>
        ${trad('Generative wallpapers, computed entirely in your browser and exported at your device’s exact resolution.')}
        ${bande(CATALOGUE.slice(0, 5))}`,
      mention: 'Téléphone, tablette<br>et ordinateur',
    },
    {
      cle: '2-rien-ne-sort',
      classe: 'st-manifeste',
      corps: `
        <h2 class="st-titre">Rien ne<br>sort d’ici</h2>
        <div class="st-puces">
          <span class="st-puce">Gratuit</span>
          <span class="st-puce">Sans compte</span>
          <span class="st-puce">Sans publicité</span>
          <span class="st-puce">Sans suivi</span>
          <span class="st-puce">Sans serveur</span>
          <span class="st-puce st-puce-pleine">Hors ligne</span>
        </div>
        <p class="st-dit">Aucune donnée ne quitte votre appareil.</p>
        ${trad('Nothing leaves your device. Free, no account, no ads, no tracking, no server, installable and fully usable offline.')}
        ${bande(CATALOGUE.slice(5, 10))}`,
      mention: 'Libre,<br>AGPL-3.0',
    },
  ]
}

/* --- La mosaïque : quatre quarts de story ------------------------------------
 *
 * Même argument que la planche, mais un quart de story n'est pas un quart de
 * planche : tout ce qui s'y écrit se lit deux fois plus petit que sur une
 * story pleine. Le texte y est donc réduit à ce qui se lit d'un coup, et
 * l'image prend le reste.
 *
 * Les deux bandes que la plateforme couvre, le bandeau de compte en haut et
 * la barre de réponse en bas, sont rendues par le rembourrage des deux
 * rangées : rien d'écrit n'y descend.
 */
function serieMosaique(donnees) {
  const { familles, palettes, densites, graines, contraste, niveau, appareil } = donnees

  return [
    {
      cle: '1-haut-gauche',
      theme: 'clair',
      classe: 'st-mosaique st-mosaique-haut st-mo-a',
      entete: friseMosaique(0),
      corps: `
        <p class="st-surtitre">Fonds d’écran génératifs</p>
        <div class="st-nom-bloc">
          <span class="marque" aria-hidden="true"><i></i><b></b></span>
          <h1 class="st-nom">Aplat</h1>
        </div>
        <p class="st-accroche">Un motif, une palette, une densité, calculés dans ton navigateur.</p>
        <div class="st-mo-ecran"><img class="st-appareil" src="${appareil}" alt=""></div>`,
    },

    {
      cle: '2-haut-droite',
      theme: 'clair',
      classe: 'st-mosaique st-mosaique-haut st-mo-b',
      entete: friseMosaique(1),
      corps: `
        <p class="st-surtitre">Le catalogue</p>
        <h2 class="st-titre">${familles} motifs</h2>
        <p class="st-p">${palettes} palettes, ${densites} densités, ${nb(graines)} graines. Tu ne retomberas pas 2 fois sur la même image.</p>
        <div class="st-mo-grille">
          ${[OUVERTURE, ...CATALOGUE.slice(0, 7)].map((m) => `<div>${toile(m, 1179, 2556)}</div>`).join('')}
        </div>`,
    },

    {
      cle: '3-bas-gauche',
      theme: 'sombre',
      classe: 'st-mosaique st-mosaique-bas st-mo-c',
      entete: '',
      coupe: 'haut',
      coupeXY: coupeMosaique(0),
      corps: `
        <p class="st-surtitre">La lisibilité</p>
        <h2 class="st-titre">Tes libellés<br>restent lisibles</h2>
        <p class="st-p">Même motif, même graine&nbsp;: seul le voile change.</p>
        <div class="st-mo-voile">
          ${cote(VOILE, false, 'sans voile')}
          ${cote(VOILE, true, 'voile automatique')}
        </div>
        <p class="st-verdict"><i></i>Lisibilité ${niveau}, ${contraste}:1</p>`,
    },

    {
      cle: '4-bas-droite',
      theme: 'sombre',
      classe: 'st-mosaique st-mosaique-bas st-final st-mo-d',
      entete: '',
      coupe: 'haut',
      coupeXY: coupeMosaique(1),
      corps: `
        <p class="st-surtitre">En 15 secondes</p>
        <h2 class="st-titre">Prends<br>une graine</h2>
        <p class="st-accroche">3 choix, un clic, un PNG à la taille de ton écran.</p>
        <div class="st-mo-appel">
          <div class="st-mo-bande">${toile(CLOTURE, 2560, 1440)}</div>
          <span class="st-appel">Générer mon fond d’écran</span>
        </div>`,
      mention: 'Gratuit,<br>sans compte',
    },
  ]
}

/* --- La page qui porte une carte ------------------------------------------ */

function document_(carte, theme, feuille, style, inverse) {
  const coupe = carte.coupe
    ? `<div class="st-coupe${carte.coupe === 'haut' ? ' st-coupe-haut' : ''} st-inverse"${
        carte.coupeXY ? ` style="--coupe-g:${carte.coupeXY.g}px;--coupe-d:${carte.coupeXY.d}px"` : ''
      }></div>`
    : ''
  const fond = carte.fond || ''
  const entete = carte.entete !== undefined ? carte.entete : tete(carte.cle.slice(0, 2))
  const bas = carte.mention
    ? pied(carte.mention, Boolean(carte.coupe) && carte.coupe !== 'haut', !carte.sansAdresse, carte.piedSonde)
    : ''

  return `<!doctype html>
<html lang="fr" data-theme="${theme}">
<head>
<meta charset="utf-8">
<title>${carte.cle}</title>
<link rel="stylesheet" href="${feuille}">
<style>${style}</style>
<style>.st-inverse {
${Object.entries(inverse).map(([nom, valeur]) => `  ${nom}: ${valeur};`).join('\n')}
}</style>
</head>
<body>
<div class="st ${carte.classe}">
  ${coupe}
  ${fond}
  ${entete}
  <main class="st-corps">${carte.corps}</main>
  ${bas}
</div>
</body>
</html>`
}

/** Peint les toiles de la carte. Le moteur du produit, rien d'autre. */
function peindre() {
  const M = window.MOTEUR

  document.querySelectorAll('canvas[data-motif]').forEach((c) => {
    const motif = JSON.parse(c.dataset.motif)
    const boite = c.getBoundingClientRect()
    const cible = (c.dataset.res || '').split('x').map(Number)
    /* Deux pixels par point : la carte est exportée à sa taille réelle, et
       les tuiles y descendent à deux cents pixels. En dessous, les courbes
       crénellent. */
    c.width = Math.max(2, Math.round(boite.width * 2))
    c.height = Math.max(2, Math.round(boite.height * 2))
    const ctx = c.getContext('2d', { alpha: false })
    /* Le moteur prend ses options dans un objet depuis qu'il sait s'arrêter à
       une couche : le voile est une option comme une autre, et non plus une
       fonction à part. */
    M.dessiner(ctx, c.width, c.height, motif, {
      voile: c.dataset.voile !== '0',
      mesureW: cible[0] || 0,
      mesureH: cible[1] || 0,
    })
  })

  /* Les jetons de libellé, déduits de la même sonde que dans l'application :
     c'est elle qui décide si les libellés sont clairs ou sombres, et les deux
     vignettes de la démonstration prennent la même, sans quoi la comparaison
     porterait sur deux choses à la fois. */
  document.querySelectorAll('[data-jetons]').forEach((boite) => {
    const v = JSON.parse(boite.dataset.jetons)
    const mesure = M.mesurer(v.famille, v.palette, v.densite, v.graine, v.l, v.h)
    const base = mesure.libelles === 'clair' ? '247,243,230' : '23,36,63'
    boite.style.setProperty('--libelle', mesure.libelles === 'clair' ? '#F7F3E6' : '#17243F')
    boite.style.setProperty('--libelle-inv', mesure.libelles === 'clair' ? '#17243F' : '#F7F3E6')
    for (const opacite of [14, 15, 16, 20, 24, 26, 28, 90]) {
      boite.style.setProperty(`--l${opacite}`, `rgba(${base},${opacite / 100})`)
    }
  })

  /* Jamais deux fois le même arrondi : c'est ce qui fait lire la grille comme
     un vrai écran plutôt que comme un damier. */
  document.querySelectorAll('[data-rayon]').forEach((icone) => {
    icone.style.borderRadius = M.RAYONS[Number(icone.dataset.rayon) % M.RAYONS.length]
  })

  /* Le nom ajusté à la largeur de sa colonne : la display est condensée, et
     sa largeur dépend des lettres. La mesurer vaut mieux que la deviner. */
  document.querySelectorAll('[data-ajuste]').forEach((el) => {
    const parent = el.parentElement
    const bords = getComputedStyle(parent)
    const cible =
      parent.clientWidth -
      Number.parseFloat(bords.paddingLeft) -
      Number.parseFloat(bords.paddingRight)
    el.style.fontSize = '100px'
    /* La largeur du texte, et non celle de sa boîte : un mot étiré par son
       conteneur mesurerait la colonne, et l'ajustement ne changerait rien. */
    const portee = document.createRange()
    portee.selectNodeContents(el)
    const largeur = portee.getBoundingClientRect().width
    if (largeur > 0) el.style.fontSize = `${Math.floor((100 * cible) / largeur)}px`
  })

  /* La couleur du nom posé sur un motif : celle que la sonde donne aux
     libellés d'icône, jamais choisie à l'oeil. */
  document.querySelectorAll('[data-sonde]').forEach((el) => {
    const v = JSON.parse(el.dataset.sonde)
    const mesure = M.mesurer(v.famille, v.palette, v.densite, v.graine, v.l, v.h)
    el.style.color = mesure.libelles === 'clair' ? '#F7F3E6' : '#17243F'
  })

  /* Les lettres remplies d'un motif. Le rendu est peint à la taille du texte,
     puis posé en fond découpé sur ses contours. */
  document.querySelectorAll('[data-remplissage]').forEach((el) => {
    const motif = JSON.parse(el.dataset.remplissage)
    const boite = el.getBoundingClientRect()
    const toile = document.createElement('canvas')
    toile.width = Math.max(2, Math.round(boite.width))
    toile.height = Math.max(2, Math.round(boite.height))
    M.dessiner(toile.getContext('2d', { alpha: false }), toile.width, toile.height, motif, {
      mesureW: 1179,
      mesureH: 2556,
    })
    el.style.backgroundImage = `url("${toile.toDataURL('image/png')}")`
  })
}

/**
 * Pose la diagonale une fois la carte mise en page.
 *
 * Les deux ordonnées sont relevées et non écrites : la coupe passe entre le
 * titre et le bloc du dessous, où qu'il soit tombé. Elle rend l'écart mesuré,
 * pour qu'une carte trop pleine se signale plutôt que de laisser la diagonale
 * mordre une ligne de texte.
 */
function couper() {
  const carte = document.querySelector('.st')
  const dessous = document.querySelector('.st-dessous')
  if (!carte || !dessous) return 0

  const haut = dessous.getBoundingClientRect().top
  const titre = document.querySelector('.st-titre')
  const bas = titre ? titre.getBoundingClientRect().bottom : 0

  const GARDE = 30
  const MARGE = 24
  const gauche = haut - GARDE
  const largeur = carte.getBoundingClientRect().width

  /* Le titre est court et aligné à gauche : la coupe ne peut le rencontrer
     qu'au bout de sa ligne la plus longue, pas au bord droit de la carte.
     La pente est donc la plus franche que cette rencontre autorise, bornée
     des deux côtés : en dessous de soixante elle passe pour une erreur de
     cadrage, au-dessus de cent trente elle incline la page. */
  const bout = titre ? titre.getBoundingClientRect().right : 0
  const possible = ((gauche - bas - MARGE) * largeur) / Math.max(1, bout)
  const pente = Math.max(60, Math.min(130, possible))

  carte.style.setProperty('--coupe-g', `${Math.round(gauche)}px`)
  carte.style.setProperty('--coupe-d', `${Math.round(gauche - pente)}px`)
  return Math.round(gauche - (pente * bout) / largeur - bas)
}

/* --- La récolte : ce qui est capturé dans l'application qui tourne --------- */

/** La maquette d'écran de l'application, motif compris, fond découpé. */
async function maquette(browser, base, motif, theme) {
  const ctx = await browser.newContext({
    viewport: { width: 1400, height: 1100 },
    deviceScaleFactor: 3,
    colorScheme: theme === 'sombre' ? 'dark' : 'light',
    locale: 'fr-FR',
  })
  const page = await ctx.newPage()
  const q = `?l=fr&t=${theme}&m=${motif.famille}&p=${motif.palette}&d=${motif.densite}&s=${motif.graine}&r=${TELEPHONE}`
  await page.goto(`${base}/app${q}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(900)
  /* Le grain du produit est déjà sur la carte : une seconde couche sur la
     découpe le doublerait juste sur l'appareil. */
  await page.addStyleTag({
    content: 'html,body{background:transparent !important}body::after{display:none !important}',
  })
  const image = await page.locator('#appareil').screenshot({ omitBackground: true })
  await ctx.close()
  return `data:image/png;base64,${image.toString('base64')}`
}

/**
 * Les deux palettes du produit, lues dans la feuille livrée.
 *
 * La carte coupée en diagonale montre les deux thèmes à la fois : il lui faut
 * donc les jetons de celui qu'elle n'a pas. Ils sont relevés ici plutôt que
 * recopiés, si bien qu'une couleur retouchée dans `tokens.css` arrive dans les
 * cartes au prochain rendu, des deux côtés de la coupe.
 */
async function palettes(browser, base) {
  const ctx = await browser.newContext({ viewport: { width: 800, height: 600 } })
  const page = await ctx.newPage()
  await page.goto(`${base}/app?l=fr`, { waitUntil: 'networkidle' })
  const lues = await page.evaluate(() => {
    /* Les noms ne sont pas listés à la main : on prend ceux que les règles
       `:root` de la feuille déclarent, quels qu'ils soient. */
    const noms = new Set()
    for (const feuille of document.styleSheets) {
      let regles
      try { regles = feuille.cssRules } catch { continue }
      for (const regle of regles) {
        if (!regle.style || !regle.selectorText || !regle.selectorText.includes(':root')) continue
        for (const propriete of regle.style) if (propriete.startsWith('--')) noms.add(propriete)
      }
    }
    const sortie = {}
    for (const theme of ['clair', 'sombre']) {
      document.documentElement.dataset.theme = theme
      const calcule = getComputedStyle(document.documentElement)
      sortie[theme] = {}
      for (const nom of noms) {
        const valeur = calcule.getPropertyValue(nom).trim()
        if (valeur) sortie[theme][nom] = valeur
      }
    }
    return sortie
  })
  await ctx.close()
  return lues
}

/** Ce que le moteur sait de lui-même : les chiffres, et une mesure. */
async function chiffres(browser, base) {
  const ctx = await browser.newContext({ viewport: { width: 800, height: 600 } })
  const page = await ctx.newPage()
  await page.goto(`${base}/app?l=fr`, { waitUntil: 'networkidle' })
  await poser(page)
  const lu = await page.evaluate((v) => {
    const M = window.MOTEUR
    const mesure = M.mesurer(v.famille, v.palette, v.densite, v.graine, 1179, 2556)
    return {
      familles: M.FAMILLES.length,
      palettes: M.ORDRE_PALETTES.length,
      contraste: mesure.contraste,
      niveau: M.niveau(mesure),
      voile: mesure.voile,
    }
  }, VOILE)
  await ctx.close()
  return lu
}

/* --- Le rendu -------------------------------------------------------------- */

;(async () => {
  fs.mkdirSync(SORTIE, { recursive: true })
  const style = fs.readFileSync(path.join(ICI, 'social.css'), 'utf8')

  /* La feuille du produit, telle qu'elle est livrée : les jetons, les polices
     et les classes partagées viennent de là, jamais d'une copie.

     Elle est lue dans le document livré et non cherchée dans le dossier : le
     build en émet une par page depuis que l'application en a deux, et prendre
     la première venue avait chargé celle du moteur, sans reset ni composants.
     Les paragraphes y retrouvaient la marge du navigateur, et six cartes
     débordaient sans que rien ne dise pourquoi. */
  const document_html = fs.readFileSync(path.join(RACINE, 'dist', 'index.html'), 'utf8')
  const declaree = document_html.match(/href="([^"]+\.css)"/)
  if (!declaree) throw new Error('aucune feuille de style déclarée dans dist/index.html')
  const feuille = declaree[1]

  const { srv, port } = await ouvrir()
  const base = `http://127.0.0.1:${port}`
  const browser = await launch()

  const lu = await chiffres(browser, base)
  const jetons = await palettes(browser, base)
  const mots = { bonne: 'bonne', juste: 'juste', insuffisante: 'insuffisante' }
  console.log(
    `moteur : ${lu.familles} familles, ${lu.palettes} palettes, ` +
    `voile ${Math.round(lu.voile * 100)} %, contraste ${lu.contraste.toFixed(1)}:1 (${lu.niveau})`,
  )

  const fichiers = []
  /* Le gabarit de chaque série : la taille où la carte est dessinée, celle à
     laquelle elle est exportée, et le nombre de colonnes quand elle se monte
     en planche. */
  const GABARITS = {
    courte: { dossier: 'trois', largeur: 1080, hauteur: 1920, echelle: 1 },
    longue: { dossier: 'huit', largeur: 1080, hauteur: 1920, echelle: 1 },
    planche: { dossier: 'planche', largeur: 1080, hauteur: 1350, echelle: 1, colonnes: 2 },
    mosaique: { dossier: 'mosaique', largeur: 540, hauteur: 960, echelle: 2, colonnes: 2 },
    manifeste: { dossier: 'manifeste', largeur: 1080, hauteur: 1920, echelle: 1 },
    affiches: { dossier: 'affiches', largeur: 1080, hauteur: 1920, echelle: 1, themes: ['clair'] },
  }
  for (const nomSerie of SERIES) {
    const gabarit = GABARITS[nomSerie]
    const planche = Boolean(gabarit.colonnes)
    const dossier = path.join(SORTIE, gabarit.dossier)
    fs.mkdirSync(dossier, { recursive: true })

    /* La planche mêle les deux thèmes dans une même image : ses panneaux
       portent chacun le leur, et la boucle ne passe qu'une fois. */
    for (const theme of gabarit.themes || (planche ? ['clair'] : ['clair', 'sombre'])) {
      const appareil = await maquette(browser, base, OUVERTURE, theme)
      const donnees = {
        familles: lu.familles,
        palettes: lu.palettes,
        densites: 3,
        graines: 99999,
        contraste: lu.contraste.toFixed(1).replace('.', ','),
        niveau: mots[lu.niveau],
        appareil,
      }
      const cartes =
        nomSerie === 'affiches' ? serieAffiches(donnees)
        : nomSerie === 'manifeste' ? serieManifeste()
        : nomSerie === 'mosaique' ? serieMosaique(donnees)
        : nomSerie === 'planche' ? seriePlanche(donnees)
        : nomSerie === 'courte' ? serieCourte(donnees)
        : serieLongue(donnees)
      const ctx = await browser.newContext({
        viewport: { width: gabarit.largeur, height: gabarit.hauteur },
        deviceScaleFactor: gabarit.echelle,
        colorScheme: theme === 'sombre' ? 'dark' : 'light',
        locale: 'fr-FR',
      })
      const page = await ctx.newPage()
      const erreurs = []
      page.on('pageerror', (err) => erreurs.push(err.message))

      for (const carte of cartes) {
        const carteTheme = carte.theme || theme
        const html = document_(carte, carteTheme, feuille, style, jetons[carteTheme === 'clair' ? 'sombre' : 'clair'])
        await page.route('**/carte-sociale.html', (route) =>
          route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html }),
        )
        await page.goto(`${base}/carte-sociale.html`, { waitUntil: 'networkidle' })
        await poser(page)
        await page.evaluate(peindre)
        await page.evaluate(() => document.fonts.ready)
        const garde = await page.evaluate(couper)
        await page.waitForTimeout(200)

        /* Le corps ne déborde jamais en silence : une carte trop pleine sort
           rognée sans qu'aucune erreur ne le dise, et c'est le genre de
           défaut qu'on ne voit qu'une fois l'image publiée. */
        const trop = await page.evaluate(() => {
          const corps = document.querySelector('.st-corps')
          return Math.round(corps.scrollHeight - corps.clientHeight)
        })

        const nom =
          planche || gabarit.themes ? `aplat-${carte.cle}.png` : `aplat-${carte.cle}-${theme}.png`
        await page.screenshot({
          path: path.join(dossier, nom),
          clip: { x: 0, y: 0, width: gabarit.largeur, height: gabarit.hauteur },
        })
        await page.unroute('**/carte-sociale.html')
        fichiers.push(nom)
        const alerte =
          trop > 1 ? `DÉBORDE ${trop} px  ` :
          carte.coupe && !carte.coupeXY && garde < 20 ? `COUPE SERRÉE ${garde} px  ` : ''
        console.log(`${alerte}${path.basename(dossier)}/${nom}`)
      }

      /* La planche entière, cousue : elle ne sert pas à publier quatre fois,
         mais à vérifier d'un coup d'œil que les coutures tombent juste, et
         elle se poste telle quelle en une seule image. */
      if (planche) {
        const noms = cartes.map((c) => `aplat-${c.cle}.png`)
        const images = noms.map((n) =>
          `data:image/png;base64,${fs.readFileSync(path.join(dossier, n)).toString('base64')}`,
        )
        const uri = await page.evaluate(async ({ images, L, H, colonnes }) => {
          const toile = document.createElement('canvas')
          toile.width = L * colonnes
          toile.height = H * Math.ceil(images.length / colonnes)
          const ctx2 = toile.getContext('2d')
          for (let i = 0; i < images.length; i += 1) {
            const img = new Image()
            img.src = images[i]
            await img.decode()
            /* La taille est imposée : les panneaux exportés au double doivent
               redescendre à celle de leur case. */
            ctx2.drawImage(img, (i % colonnes) * L, Math.floor(i / colonnes) * H, L, H)
          }
          return toile.toDataURL('image/png')
        }, { images, L: gabarit.largeur, H: gabarit.hauteur, colonnes: gabarit.colonnes })
        const entiere = `aplat-${gabarit.dossier}-entiere.png`
        fs.writeFileSync(path.join(dossier, entiere), Buffer.from(uri.split(',')[1], 'base64'))
        fichiers.push(entiere)
        console.log(`${gabarit.dossier}/${entiere}`)
      }

      if (erreurs.length) console.log('erreurs de page :', erreurs.join(' | '))
      await ctx.close()
    }
  }

  await browser.close()
  srv.close()
  console.log(`\n${fichiers.length} cartes dans ${path.relative(RACINE, SORTIE)}/`)
})()
