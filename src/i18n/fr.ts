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
      /* Dit une fois, en haut, ce que toute la page fait. Sans cette phrase,
         il faut avoir l'idée de toucher une image pour découvrir que la page
         entière est le générateur. */
      interaction: 'Chaque écran de cette page est un bouton. Touche-le, le motif change.',
      changer: 'Changer le motif de cet écran de téléphone',
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
      changer: 'Changer le motif de cet écran d’ordinateur',
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
      changer: 'Changer le motif de la démonstration du voile',
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
    /* Le texte alternatif dit la version parce que l'image en dépend vraiment :
       ce n'est pas le même fichier, et quelqu'un qui ne voit pas l'aperçu ne
       peut pas le deviner du réglage. */
    alternativeSombre: 'Version sombre\u00a0: le motif est assombri dans le fichier.',
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
    /* Le voile retiré à la main. Il ne se dit pas comme un voile nul mesuré :
       l'un est ce que la sonde a trouvé, l'autre est une décision. */
    voileRetire: 'voile retiré du fichier',
    detail: '{contraste}:1\u00a0; {libelles}\u00a0; {voile}. {conseil}',
  },
  reglages: {
    titre: 'Réglages',
    famille: 'Famille de motif',
    /* Les trois groupes sont devenus trois onglets. Le mot du groupe ne change
       pas pour autant : c'est le même classement, montré autrement. */
    groupeAbstraits: 'Abstraits',
    groupePaysages: 'Paysages',
    groupeFigures: 'Figures',
    onglets: 'Groupes de familles',
    palette: 'Palette',
    densite: 'Densité',
    calme: 'Calme',
    moyen: 'Moyen',
    dense: 'Dense',
    /* La version claire ou sombre. Ce n'est pas le thème de l'application, qui
       est au pied de page : c'est le fichier lui-même, et les mots doivent le
       dire sans détour. Le mot « version » plutôt que « thème » ou « mode »
       pour cette seule raison : on choisit entre deux fichiers. */
    version: 'Version',
    versionClaire: 'Claire',
    versionSombre: 'Sombre',
    versionNote: 'La version sombre est assombrie dans le fichier : c’est elle qu’on télécharge.',
    versionTitreClaire: 'Le motif tel que la palette le donne',
    versionTitreSombre: 'Le même motif, assombri dans le fichier téléchargé',
  },
  /* Les palettes composées à la main. Elles vivent dans la carte Palette, sous
     les onze livrées, parce que ce sont des palettes et non un autre réglage. */
  palettes: {
    miennes: 'Mes palettes',
    composer: 'Composer une palette',
    modifier: 'Modifier {nom}',
    supprimer: 'Supprimer {nom}',
    nom: 'Nom de la palette',
    nomDefaut: 'Ma palette',
    fond: 'Fond',
    nuancier: 'Nuancier de {nom}',
    teinte: 'Teinte {n}',
    ajouterTeinte: 'Ajouter une teinte',
    retirerTeinte: 'Retirer la teinte {n}',
    enregistrer: 'Enregistrer',
    annuler: 'Annuler',
    bornes: 'Le fond, puis deux à cinq teintes. Six couleurs au plus.',
    invalide: 'Six chiffres hexadécimaux par couleur, comme 17243F.',
    pleine: 'Douze palettes au plus. Supprime-en une pour en composer une autre.',
    vide: 'Aucune palette composée. La tienne tiendra ici.',
    /* Une palette arrivée par un lien. Elle est utilisable tout de suite et
       n'est écrite nulle part tant qu'on ne l'a pas enregistrée : un lien reçu
       ne remplit pas le stockage de qui l'ouvre. */
    recue: 'Palette reçue par le lien. Enregistre-la pour la garder sur cet appareil.',
    garder: 'Enregistrer la palette reçue',
    note: 'Gardées sur cet appareil, dans le navigateur : un nom et des couleurs, rien d’autre.',
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
      'Gardés sur cet appareil, dans le navigateur : quatre réglages par motif, ni image ni identifiant. Les épinglés restent quand les autres passent.',
    motif: '{famille}, {palette}, graine {graine}',
    /* L'épingle est un second bouton par vignette, donc un second libellé.
       Il nomme le motif comme le premier : sans le nom, dix épingles se
       ressemblent toutes à l'oreille. */
    epingler: 'Épingler {motif}',
    desepingler: 'Retirer l’épingle de {motif}',
    epingle: 'Épinglé',
    epinglerCourt: 'Épingler',
    pleines: 'Six épingles au plus : la liste reste une mémoire courte.',
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
      'Aucun compte, aucun réseau. Les dix derniers motifs sont gardés sur cet appareil, dans le navigateur : quatre réglages chacun, ni image ni identifiant, effaçables d’un bouton. Les palettes que tu composes y sont gardées de la même façon, un nom et des couleurs, supprimables une à une. Rien d’autre n’est enregistré ; hors ligne, le navigateur ne garde que les fichiers de l’application.',
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
    /* Deux gestes voisins, deux libellés qui ne peuvent pas se confondre :
       « Variante » redessine le même motif avec une autre graine,
       « Surprends-moi » tire une autre famille et une autre palette. Ils sont
       maintenant côte à côte, ce qui rend la distinction plus utile encore. */
    surprise: 'Surprends-moi',
    surpriseTitre: 'Tire au hasard une famille, une palette et une graine',
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
    erreurFormat: 'Ce navigateur ne sait pas encoder ce format. Le PNG, lui, passe partout.',
    erreurPresse: 'Le presse-papiers a refusé l’image. Télécharge-la, c’est le même fichier.',
    erreurSvg: 'Ce motif compte trop de formes pour un SVG utile. Le PNG reste la bonne sortie.',
    reessayer: 'Réessayer',
    /* La ligne sous le bouton. Le voile est brûlé dans le fichier : quelqu'un
       qui télécharge sans avoir lu la page d'accueil recevait une image plus
       sombre que celle qu'il croyait avoir choisie, et rien ne le disait. */
    voileInclus: 'Le voile de lisibilité est inclus dans le fichier.',
    voileAbsent: 'Le voile de lisibilité est retiré du fichier.',
    /* Le voile demandé, mais que la sonde n'a pas eu à poser. C'est le cas
       courant de la version sombre, qui descend bien sous le seuil que le
       voile vise, et le cas rare d'une palette déjà sombre. Dire « inclus dans
       le fichier » là serait faux, et c'est exactement le genre de phrase que
       ce produit ne doit pas écrire. */
    voileNul: 'Le fichier n’a pas besoin de voile de lisibilité.',
    /* La version, nommée sous le bouton qui la télécharge : c'est là qu'on
       décide, et le nom du fichier le dira ensuite. */
    versionSombre: 'Version sombre\u00a0: le motif est assombri dans le fichier.',
    voileRetirer: 'Retirer',
    voileRemettre: 'Remettre',
    voileTitre: 'Le voile assombrit le bas de l’image pour que les libellés d’icônes tiennent le seuil',
    /* Les autres sorties. Elles ne servent pas la même chose, et le libellé le
       dit : la ligne du haut est le fond d'écran, les autres sont des usages. */
    formats: 'Autres formats',
    formatsTitre: 'PNG doublé, WebP, SVG, presse-papiers, les trois appareils',
    formatsFermer: 'Fermer les formats',
    formatPng2x: 'PNG 2x',
    formatPng2xNote: 'Deux fois plus de pixels, pour un écran plus grand que celui-ci.',
    formatWebp: 'WebP',
    formatWebpNote: 'La même image, deux à trois fois plus légère, pour l’envoyer.',
    formatSvg: 'SVG',
    formatSvgNote: 'Le motif en vectoriel, à reprendre ailleurs. Sans le grain, qu’un SVG ne porte pas.',
    formatSvgDense: 'Indisponible : ce motif compte trop de formes.',
    formatCopie: 'Copier l’image',
    formatCopieNote: 'Un PNG dans le presse-papiers, à coller dans une conversation.',
    copiee: 'Image copiée',
    formatTrois: 'Les trois appareils',
    formatTroisNote: 'La même graine en téléphone, tablette et ordinateur, en une fois.',
    enregistresTrois: 'Trois images enregistrées',
    metaTrois: 'Téléphone, tablette et ordinateur. PNG, {poids} en tout.',
  },
  miseAJour: {
    texte: 'Une nouvelle version d’Aplat est prête.',
    action: 'Recharger',
    fermer: 'Plus tard',
  },
  pied: {
    source: 'Code source',
    licence: 'AGPL-3.0',
    /* Aplat est gratuit, sans compte et sans pub, et le restera. Le lien de
       soutien est donc une porte, pas une caisse : il est dans le pied, à côté
       de la licence, et rien dans l'application ne le rappelle. */
    soutien: 'Offrir un café',
    soutienTitre: 'Soutenir Aplat sur Ko-fi. Le lien ouvre un autre site.',
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
