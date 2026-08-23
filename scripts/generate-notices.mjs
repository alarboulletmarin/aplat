// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Rassemble les licences des dépendances embarquées dans le build.
 *
 * Ce n'est pas du confort : React et React DOM sont sous licence MIT, qui
 * demande que leur mention de copyright accompagne « toute copie ou portion
 * substantielle du logiciel ». Le fichier `dist/assets/index-*.js` contient
 * leur code ; il doit donc voyager avec leurs notices.
 *
 * Sans dépendance, comme `generate-icons.mjs` : la liste des paquets vient de
 * `package-lock.json` — c'est lui qui sait ce qui est installé et ce qui n'est
 * là que pour le développement —, et les textes viennent des fichiers LICENSE
 * de `node_modules`.
 *
 * Lancé par `npm run build`, pour qu'aucune mise à jour de dépendance ne puisse
 * laisser le fichier derrière elle.
 *
 * Usage : npm run notices
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..')
const SORTIE = join(RACINE, 'public', 'THIRD-PARTY.txt')

/** Noms de fichiers de licence rencontrés dans la nature. */
const FICHIERS_LICENCE = /^(licen[cs]e|copying|notice)(\.(md|txt))?$/i

/**
 * Les paquets embarqués : tout ce que le verrou connaît, moins ce qui ne sert
 * qu'au développement. Un paquet utilisé des deux côtés n'est pas marqué
 * `dev` — c'est ce qui rend ce filtre sûr par défaut.
 */
function paquetsEmbarques() {
  const verrou = JSON.parse(readFileSync(join(RACINE, 'package-lock.json'), 'utf8'))
  const paquets = []
  for (const [chemin, infos] of Object.entries(verrou.packages ?? {})) {
    if (chemin === '' || infos.dev === true || infos.link === true) continue
    const nom = chemin.slice(chemin.lastIndexOf('node_modules/') + 'node_modules/'.length)
    paquets.push({ nom, version: infos.version, chemin: join(RACINE, chemin) })
  }
  return paquets.sort((a, b) => a.nom.localeCompare(b.nom, 'en'))
}

/** Le texte de licence d'un paquet, ou null s'il n'en publie aucun. */
function texteLicence(chemin) {
  let entrees
  try {
    entrees = readdirSync(chemin)
  } catch {
    return null
  }
  const fichier = entrees.find((entree) => FICHIERS_LICENCE.test(entree))
  if (!fichier) return null
  try {
    return readFileSync(join(chemin, fichier), 'utf8').trim()
  } catch {
    return null
  }
}

/** Le nom de la licence déclaré par le paquet lui-même. */
function nomLicence(chemin) {
  try {
    const manifeste = JSON.parse(readFileSync(join(chemin, 'package.json'), 'utf8'))
    if (typeof manifeste.license === 'string') return manifeste.license
    if (typeof manifeste.licenses?.[0]?.type === 'string') {
      return manifeste.licenses[0].type
    }
  } catch {
    /* Un paquet sans manifeste lisible : on le dit plutôt que de l'inventer. */
  }
  return 'licence non déclarée'
}

const paquets = paquetsEmbarques()

const entete = [
  'Aplat — licences des composants tiers',
  '',
  'Aplat est distribué sous licence AGPL-3.0-only (voir LICENSE). Le fichier',
  'JavaScript produit par le build embarque le code des bibliothèques listées',
  'ci-dessous ; leurs licences respectives — permissives, donc compatibles avec',
  "l'AGPL — sont reproduites ici, comme elles le demandent.",
  '',
  'Ce fichier est régénéré à chaque build par scripts/generate-notices.mjs.',
  '',
  `${paquets.length} paquets :`,
  ...paquets.map((paquet) => `  · ${paquet.nom}@${paquet.version}`),
  '',
]

const corps = paquets.map((paquet) => {
  const texte = texteLicence(paquet.chemin)
  const titre = `${paquet.nom}@${paquet.version} — ${nomLicence(paquet.chemin)}`
  return [
    '='.repeat(78),
    titre,
    '='.repeat(78),
    '',
    texte ??
      'Ce paquet ne publie pas de fichier de licence. Voir son dépôt pour le\ntexte complet.',
    '',
  ].join('\n')
})

writeFileSync(SORTIE, [entete.join('\n'), ...corps].join('\n'), 'utf8')

const taille = (readFileSync(SORTIE).length / 1024).toFixed(1)
console.log(`THIRD-PARTY.txt — ${paquets.length} paquets (${taille} Ko)`)
