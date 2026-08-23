// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Les libellés français sont la référence : le type `Textes` en est déduit,
 * et l'anglais doit s'y conformer clé pour clé.
 *
 * Les gabarits laissent 30 % de marge. Selon l'endroit, un libellé long revient
 * à la ligne sans jamais s'élider (puces de famille et de palette, deux lignes
 * au plus), replie sa rangée (langue, thème), s'étire avec sa colonne (cartes),
 * ou s'élide (icônes de la maquette, bouton secondaire).
 */
export const fr = {
  document: {
    titre: 'Aplat\u00a0: fonds d’écran génératifs',
    description:
      'Générateur de fonds d’écran génératifs, calculé entièrement dans le navigateur. Sans compte, sans réseau, sans rien envoyer.',
  },
  /* La page d'accueil, sur « / ». Elle a son propre titre et sa propre
     description : elle présente le projet, l'application le fait tourner, et
     les deux ne se cherchent pas dans les mêmes mots.

     Le tutoiement est celui de l'application. Une présentation en « vous »
     suivie d'un outil en « tu » ferait entendre deux voix pour un seul
     produit, et c'est la voix de l'outil qui compte. */
  accueil: {
    document: {
      titre: 'Aplat : fonds d’écran génératifs',
      description:
        'Un motif, une palette, une densité. Aplat calcule ton fond d’écran dans ton navigateur et te le rend à la résolution exacte de ton écran. Sans compte, sans réseau.',
    },
    enseigne: {
      evitement: 'Aller au contenu',
      ouvrir: 'Ouvrir l’app',
    },
    /* Les deux bascules de l'en-tête. Chacune montre ce qu'un appui donnera,
       jamais l'état où l'on est : un bouton est un geste, et « Sombre » sur
       fond clair ne dit pas si c'est le thème actuel ou celui qui vient.

       Le libellé de langue est écrit dans la langue d'arrivée, avec son
       attribut `lang` : une synthèse vocale française qui lit « English »
       à la française donnerait un mot que personne ne reconnaît. */
    bascule: {
      versClair: 'Passer au thème clair',
      versSombre: 'Passer au thème sombre',
      langueCode: 'EN',
      langueVers: 'Switch to English',
      langueCible: 'en',
    },
    heros: {
      surtitre: 'Fonds d’écran génératifs',
      accroche:
        'Un motif, une palette, une densité. Calculé dans ton navigateur, téléchargé en pleine résolution.',
      primaire: 'Générer mon fond d’écran',
      secondaire: 'Voir des exemples',
      mention: 'Sans compte, sans envoi, sans stockage. PNG jusqu’à 40 Mpx.',
      /* Sous la maquette : ce qu'on regarde, en toutes lettres. La maquette
         change de motif toute seule, et une image qui tourne sans être nommée
         passe pour une décoration. */
      legende: '{famille}, palette {palette}',
    },
    /* Les quatre chiffres du bandeau. Ils ne sont pas écrits ici : le
       composant les lit dans le moteur, si bien qu'une famille ajoutée les
       corrige d'elle-même. Seuls les mots sont de la langue. */
    chiffres: {
      motifs: 'motifs',
      palettes: 'palettes',
      densites: 'densités',
      graines: 'graines',
    },
    galerie: {
      titre: 'Ce que ça donne',
      note: 'Des rendus vrais, calculés à l’instant, dans cette page. Touche une image pour relancer sa graine.',
      relancer: '{famille}, palette {palette}. Relancer la graine.',
      ouvrir: 'Ouvrir ce motif dans l’app',
    },
    ecrans: {
      titre: 'De la poche au bureau',
      note: 'La résolution de ton écran est détectée toute seule. Ou tu saisis la tienne.',
    },
    promesses: {
      unTitre: 'Rien ne sort d’ici',
      unCorps:
        'Aucun compte, aucun serveur, aucune mesure d’audience. Le pixel est calculé sur ton appareil, puis oublié.',
      deuxTitre: 'Une graine, un lien',
      deuxCorps:
        'Le lien porte tes réglages. Tu retrouves exactement la même image, ou tu l’envoies à quelqu’un.',
      troisTitre: 'Tes libellés restent lisibles',
      troisCorps:
        'Aplat mesure le contraste sous la grille d’icônes et pose un voile, juste ce qu’il faut.',
      sansVoile: 'sans voile',
      avecVoile: 'voile automatique',
    },
    appel: {
      titre: 'Prends une graine',
      corps: 'Trois choix, un clic, un PNG. Ton fond d’écran est à quinze secondes.',
    },
    pied: {
      mention: 'Calculé dans le navigateur, aucune donnée collectée',
    },
  },
  entete: {
    evitement: 'Aller aux réglages',
    titre: 'Aplat',
    /* La marque est un lien vers « / ». Le mot du titre le nomme déjà ; cette
       mention, lue par les seules technologies d'assistance, dit où il mène. */
    accueil: 'Retour à la présentation',
    accroche:
      'Des fonds d’écran génératifs, calculés dans ton navigateur. Téléphone, tablette, ordinateur.',
    /* Au bout de la ligne de l'accroche : la promesse en trois mots, celle que
       le pied de page détaille et que le partage répète en entier. Elle est
       écrite courte parce qu'elle ne revient pas à la ligne. */
    mention: 'Sans compte, sans réseau.',
  },
  scene: {
    titre: 'Aperçu du fond d’écran',
    alternative:
      'Motif {famille}, palette {palette}, densité {densite}, graine {graine}. Aperçu derrière une grille d’icônes factices.',
    note: 'Maquette d’écran : heure, widget et icônes sont fictifs, ils servent à juger la lisibilité.',
    videTitre: 'Indique une résolution',
    videCorps: 'Largeur et hauteur en pixels, ou reviens à la détection.',
  },
  /* Trois bandes, trois mots, et rien entre les deux. Les clés portent le nom
     du niveau rendu par `niveau()` : le composant y puise directement, si bien
     que le qualificatif affiché ne peut pas s'écarter du rapport mesuré. Le
     titre disait « correcte » pour 3,5:1, sous le seuil AA du petit texte
     qu'est un libellé d'icône, pendant que le corps disait « un peu juste ». */
  lisibilite: {
    titre: 'Lisibilité des libellés',
    attente: 'Rien à mesurer tant qu’il n’y a pas d’image.',
    bonne: 'bonne',
    juste: 'juste',
    insuffisante: 'insuffisante',
    libellesClairs: 'libellés clairs',
    libellesSombres: 'libellés sombres',
    conseilBonne: 'Au-dessus du seuil AA de 4,5:1 : les libellés restent nets sur toute la grille.',
    conseilJuste:
      'Sous le seuil AA de 4,5:1, au-dessus de 3:1 : une palette plus sombre ou une densité plus calme regagne la marge.',
    conseilInsuffisante: 'Sous 3:1 : essaie la palette Nuit, ou une densité plus calme.',
    voile: 'voile de lisibilité {n} %',
    sansVoile: 'sans voile',
    /* Assemblés ici et non dans le composant : la ponctuation d'un titre ou
       d'une énumération appartient à la langue. Le point-virgule sépare les
       trois mesures parce que la virgule est déjà prise par la décimale
       française, « 4,5:1 ». */
    titreNiveau: 'Lisibilité des libellés\u00a0: {niveau}',
    /* La forme repliée, sur une ligne. Le mot d'abord, le chiffre ensuite :
       c'est le mot qui décide, le chiffre qui l'appuie. */
    resume: 'Lisibilité {niveau}, {contraste}:1',
    /* L'aperçu assombri. Le mot « approché » n'est pas une précaution
       oratoire : aucune plateforme ne publie la force de son assombrissement,
       et le produit ne prétend pas mesurer ce qu'il estime. */
    assombri: 'Assombri',
    assombriTitre: 'Simule le fond assombri d’un thème sombre, sans changer le fichier',
    assombriNote:
      'Aperçu assombri, comme un thème sombre le ferait, à peu près. Le fichier téléchargé, lui, ne change pas.',
    detail: '{contraste}:1\u00a0; {libelles}\u00a0; {voile}. {conseil}',
  },
  reglages: {
    titre: 'Réglages',
    famille: 'Famille de motif',
    groupeAbstraits: 'Abstraits',
    groupePaysages: 'Paysages',
    groupeFigures: 'Figures',
    palette: 'Palette',
    /* Deux gestes voisins, deux libellés qui ne peuvent pas se confondre :
       « Autre variante » redessine le même motif avec une autre graine,
       « Surprends-moi » tire une autre famille et une autre palette. */
    surprise: 'Surprends-moi',
    surpriseTitre: 'Tire au hasard une famille, une palette et une graine',
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
    /* Les quatre premiers préréglages nomment un appareil ; celui-ci nomme une
       taille, parce que c'est sous ce nom qu'on la demande. Rien n'y est
       agrandi : le motif est recalculé à ces pixels-là, comme à tous les
       autres. */
    presetUHD: '4K',
  },
  historique: {
    titre: 'Derniers motifs',
    vide: 'Les motifs que tu regardes s’ajoutent ici, dix au plus.',
    effacer: 'Effacer',
    note:
      'Gardés sur cet appareil, dans le navigateur : quatre réglages par motif, ni image ni identifiant.',
    motif: '{famille}, {palette}, graine {graine}',
  },
  partage: {
    titre: 'Partage',
    copier: 'Copier le lien du motif',
    copie: 'Lien copié',
    echec: 'Copie impossible. Le lien est ci-dessous, à copier à la main.',
    note: 'Le lien contient les réglages, rien d’autre.',
    graine: 'Graine',
    /* La formule doit rester exacte des deux côtés : le Service Worker met
       bien quelque chose en cache, à savoir les fichiers de l'application, et
       l'historique garde bien quelque chose, à savoir dix fois quatre
       réglages. Une promesse plus large que le produit ne vaut rien. */
    confidentialite:
      'Aucun compte, aucun réseau. Les dix derniers motifs sont gardés sur cet appareil, dans le navigateur : quatre réglages chacun, ni image ni identifiant, effaçables d’un bouton. Rien d’autre n’est enregistré ; hors ligne, le navigateur ne garde que les fichiers de l’application.',
  },
  preferences: {
    langue: 'Langue',
    theme: 'Thème',
    clair: 'Clair',
    sombre: 'Sombre',
    systeme: 'Système',
  },
  barre: {
    /* Un mot, parce que la place manque à 320 px et qu'un libellé secondaire
       tronqué en « Autre… » ne dit plus rien. Le titre porte la phrase
       entière, et contient le mot visible : l'un ne contredit pas l'autre. */
    nouveau: 'Variante',
    nouveauTitre: 'Redessine le même motif avec une autre graine',
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
