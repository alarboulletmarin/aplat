// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Les libellés français sont la référence : le type `Textes` en est déduit,
 * et l'anglais doit s'y conformer clé pour clé.
 *
 * Les gabarits laissent 30 % de marge. Selon l'endroit, un libellé long revient
 * à la ligne (puces de famille et de palette), replie sa rangée (langue,
 * thème), s'étire avec sa colonne (cartes), ou s'élide (icônes de la maquette,
 * bouton secondaire).
 */
export const fr = {
  document: {
    titre: 'Aplat\u00a0: fonds d’écran génératifs',
    description:
      'Générateur de fonds d’écran génératifs, calculé entièrement dans le navigateur. Sans compte, sans réseau, sans donnée enregistrée.',
  },
  entete: {
    evitement: 'Aller aux réglages',
    titre: 'Aplat',
    accroche:
      'Des fonds d’écran génératifs, calculés dans ton navigateur. Téléphone, tablette, ordinateur.',
  },
  scene: {
    titre: 'Aperçu du fond d’écran',
    alternative:
      'Motif {famille}, palette {palette}, densité {densite}, graine {graine}. Aperçu derrière une grille d’icônes factices.',
    note: 'Maquette d’écran : heure, widget et icônes sont fictifs, ils servent à juger la lisibilité.',
    videTitre: 'Indique une résolution',
    videCorps: 'Largeur et hauteur en pixels, ou reviens à la détection.',
  },
  lisibilite: {
    titre: 'Lisibilité des libellés',
    attente: 'Rien à mesurer tant qu’il n’y a pas d’image.',
    bonne: 'bonne',
    correcte: 'correcte',
    faible: 'faible',
    libellesClairs: 'libellés clairs',
    libellesSombres: 'libellés sombres',
    conseilBonne: 'Les libellés restent nets sur toute la grille.',
    conseilCorrecte: 'Lisible, un peu juste sur les zones les plus contrastées.',
    conseilFaible: 'Essaie la palette Nuit, ou une densité plus calme.',
    voile: 'voile de lisibilité {n} %',
    sansVoile: 'sans voile',
    /* Assemblés ici et non dans le composant : la ponctuation d'un titre ou
       d'une énumération appartient à la langue. Le point-virgule sépare les
       trois mesures parce que la virgule est déjà prise par la décimale
       française, « 4,5:1 ». */
    titreNiveau: 'Lisibilité des libellés\u00a0: {niveau}',
    detail: '{contraste}:1\u00a0; {libelles}\u00a0; {voile}. {conseil}',
  },
  reglages: {
    titre: 'Réglages',
    famille: 'Famille de motif',
    groupeAbstraits: 'Abstraits',
    groupeFigures: 'Figures',
    palette: 'Palette',
    densite: 'Densité',
    calme: 'Calme',
    moyen: 'Moyen',
    dense: 'Dense',
  },
  resolution: {
    titre: 'Résolution de l’image',
    surMesure: 'Sur mesure…',
    aucune: 'Aucune résolution',
    largeur: 'Largeur (px)',
    hauteur: 'Hauteur (px)',
    bornes: 'De 16 à 8000 px.',
    horsBornes: 'Entre 16 et 8000 px : cette valeur ne peut pas être produite.',
    detectee: 'détecté sur cet appareil',
    saisie: 'saisi à la main',
    telephone: 'Téléphone',
    tablette: 'Tablette',
    ordinateur: 'Ordinateur',
    presetAppareil: 'Cet appareil',
    presetTelephone: 'Téléphone',
    presetTablette: 'Tablette',
    presetOrdinateur: 'Ordinateur',
  },
  partage: {
    titre: 'Partage et réglages',
    copier: 'Copier le lien du motif',
    copie: 'Lien copié',
    echec: 'Copie impossible. Le lien est ci-dessous, à copier à la main.',
    note: 'Le lien contient les réglages, rien d’autre.',
    graine: 'Graine',
    /* La formule doit rester exacte : le Service Worker met bien quelque
       chose en cache, à savoir les fichiers de l'application, jamais un
       réglage ni une image. */
    confidentialite:
      'Aucun compte, aucun réseau, aucune donnée enregistrée. Tout est calculé sur cet appareil ; hors ligne, le navigateur ne garde que les fichiers de l’application.',
  },
  preferences: {
    langue: 'Langue',
    theme: 'Thème',
    clair: 'Clair',
    sombre: 'Sombre',
    systeme: 'Système',
  },
  barre: {
    nouveau: 'Nouveau motif',
    telecharger: 'Télécharger',
    rendu: 'Rendu en cours',
    enregistre: 'Image enregistrée',
    ko: 'Ko',
    mo: 'Mo',
    astuce:
      'Sur téléphone : appui long sur l’image téléchargée, puis « Ajouter aux photos ».',
    erreurTitre: 'Le rendu a échoué',
    erreurTrop: '{mpx} Mpx dépassent ce que le navigateur peut produire. Reste sous 40 Mpx.',
    erreurGenerale: 'Impossible de créer le fichier. Réessaie.',
    erreurCapacite:
      'Cet appareil n’a pas pu produire une image de cette taille. Essaie une résolution plus petite.',
    reessayer: 'Réessayer',
  },
  miseAJour: {
    texte: 'Une nouvelle version d’Aplat est prête.',
    action: 'Recharger',
    fermer: 'Plus tard',
  },
  pied: {
    source: 'Code source',
    licence: 'AGPL-3.0',
  },
  maquette: {
    recherche: 'Rechercher',
    applications: [
      'Appareil', 'Notes', 'Cartes', 'Musique', 'Météo', 'Horloge', 'Photos', 'Agenda',
      'Fichiers', 'Réglages', 'Podcasts', 'Rappels', 'Livres', 'Santé', 'Courrier', 'Radio',
      'Traduction', 'Boussole', 'Calculatrice', 'Dictaphone', 'Contacts', 'Atlas', 'Minuteur', 'Bloc-notes',
    ],
    bureau: ['Documents', 'Images', 'Projets', 'Archives', 'Corbeille'],
    dock: ['Téléphone', 'Messages', 'Navigateur', 'Musique', 'Réglages', 'Corbeille'],
    menu: ['Fichier', 'Édition', 'Affichage'],
  },
}

/** Le contrat que l'anglais doit remplir, clé pour clé. */
export type Textes = typeof fr
