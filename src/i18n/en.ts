// SPDX-License-Identifier: AGPL-3.0-only

import type { Textes } from './fr'

/** English labels. The type is the French file: a missing key does not build. */
export const en: Textes = {
  document: {
    titre: 'Aplat: generative wallpapers',
    description:
      'Generative wallpaper maker, computed entirely inside the browser. No account, no network, nothing sent.',
  },
  accueil: {
    document: {
      titre: 'Aplat: generative wallpapers',
      description:
        'One pattern, one palette, one density. Aplat computes your wallpaper inside your browser and hands it back at your screen’s exact resolution. No account, no network.',
    },
    enseigne: {
      evitement: 'Skip to content',
      ouvrir: 'Open the app',
    },
    bascule: {
      versClair: 'Switch to the light theme',
      versSombre: 'Switch to the dark theme',
      langueCode: 'FR',
      langueVers: 'Passer en français',
      langueCible: 'fr',
    },
    heros: {
      surtitre: 'Generative wallpapers',
      accroche:
        'One pattern, one palette, one density. Computed inside your browser, downloaded at full resolution.',
      primaire: 'Make my wallpaper',
      secondaire: 'See examples',
      mention: 'No account, nothing sent, nothing stored. PNG up to 40 Mpx.',
      legende: '{famille}, {palette} palette',
      interaction: 'Every screen on this page is a button. Tap one, the pattern changes.',
      changer: 'Change the pattern on this phone screen',
    },
    chiffres: {
      motifs: 'patterns',
      palettes: 'palettes',
      densites: 'densities',
      graines: 'seeds',
    },
    galerie: {
      titre: 'What it looks like',
      note: 'Real renders, computed right now, on this page. Tap an image to reroll its seed.',
      relancer: '{famille}, {palette} palette. Reroll the seed.',
      ouvrir: 'Open this pattern in the app',
      moteurTitre: 'How it is made',
      moteurNote: 'The mechanism, in six steps.',
    },
    ecrans: {
      titre: 'From pocket to desk',
      note: 'Your screen resolution is detected on its own. Or you type your own.',
      changer: 'Change the pattern on this desktop screen',
    },
    promesses: {
      unTitre: 'Nothing leaves this page',
      unCorps:
        'No account, no server, no analytics. The pixel is computed on your device, then forgotten.',
      deuxTitre: 'One seed, one link',
      deuxCorps:
        'The link carries your settings. You get exactly the same image back, or you send it to someone.',
      troisTitre: 'Your icon labels stay legible',
      troisCorps:
        'Aplat measures the contrast under the icon grid and lays down a veil, just enough.',
      sansVoile: 'no veil',
      avecVoile: 'automatic veil',
      changer: 'Change the pattern in the veil demonstration',
    },
    appel: {
      titre: 'Take a seed',
      corps: 'Three choices, one click, one PNG. Your wallpaper is fifteen seconds away.',
    },
    pied: {
      mention: 'Computed in the browser, no data collected',
    },
  },
  moteur: {
    document: {
      titre: 'How Aplat draws',
      description:
        'Four settings, fifteen drawing mechanics, four layers and a readability probe. The Aplat mechanism, demonstrated by the engine itself, inside your browser.',
    },
    heros: {
      surtitre: 'The mechanism',
      titre: 'How it works',
      accroche:
        'Aplat does not pick from a stock of images: it computes one, on your device, out of four numbers. Here is how, in six steps.',
      interaction:
        'All six steps build the same pattern, and every one of them can be handled. The one you end up with is waiting at the bottom of the page.',
      mention: 'No screenshots: everything you see here comes out of the engine, right now.',
    },
    etapes: {
      unTitre: 'Four settings, nothing else',
      unNote:
        'A family, a palette, a density, a seed. Aplat knows nothing else about your image, and that is enough.',
      deuxTitre: 'A seed is an address',
      deuxNote:
        'The same four settings always render the same image, at any size. Chance enters once, when the seed is drawn.',
      troisTitre: 'Fifteen ways to lay down colour',
      troisNote:
        'A family does not pick a drawing, it picks a mechanic. The engine knows fifteen of them, and every family comes out of one.',
      quatreTitre: 'Four layers, in this order',
      quatreNote:
        'The image is painted over itself, and the order is not a detail: the scrim is dosed for what it covers, the grain comes after it.',
      cinqTitre: 'A probe measures what you are about to download',
      cinqNote:
        'Before painting, the engine measures the luminance under the icon grid, picks the label colour that holds, then doses the scrim.',
      sixTitre: 'The preview is the file',
      sixNote:
        'No shape has a size in pixels: everything is relative to the short side. The pattern is recomputed at the size you ask for, never scaled up.',
    },
    reglages: {
      groupe: 'Family group',
      autre: 'Another family',
      autreTitre: 'Draw another family from the {groupe} group',
      legende: '{famille}, {palette} palette',
      compte: '{familles} families, {palettes} palettes, {densites} densities, {graines} seeds.',
    },
    graine: {
      valeur: 'Seed {graine}, out of {max}',
      dessin: 'Drawing seed {n}, mixed from the family, the density and the seed.',
      voisine: 'Take seed {graine}',
      relancer: 'Another seed',
      voisines: 'Neighbouring seeds',
      sourdes:
        'Four families ignore their seed: they are fully regular tilings, without a single draw.',
    },
    mecaniques: {
      familles: 'Families: {liste}',
      etAutres: '{liste} and {n} more',
      adopter: 'See this mechanic on my pattern',
      courante: 'This is your pattern’s mechanic',
      semerNom: 'Flat shapes',
      semerNote:
        'Shapes sown or ranked on a solid ground, laid one over another. It is the original gesture, and it still paints half the families.',
      niveauxNom: 'Contour lines',
      niveauxNote:
        'A relief is cut into steps, and each step becomes a closed flat. The shape comes out of the levels, never out of a stroke.',
      fracturesNom: 'Fracture',
      fracturesNote:
        'Seeds share the surface out, each piece clipped by half-planes, or by curved frontiers when the plane is warped beneath them. The joints are not drawn, they show through.',
      reservesNom: 'Reserve',
      reservesNote:
        'The pattern is what you take away: the panel first, the openings after, in the colour of whatever shows through.',
      chimieNom: 'Reaction',
      chimieNote:
        'Two substances feed on and consume each other over a grid, and the culture is frozen at a chosen instant. Density sets the time here, not the count.',
      pavagesNom: 'Aperiodic tiling',
      pavagesNote:
        'Ten golden triangles in a sun, then successive subdivisions: the surface is covered entirely without ever repeating.',
      lieuxNom: 'Halftone engraving',
      lieuxNote:
        'A scene described as a field of ink density, which a cross-hatched halftone screen turns into dots. Two tones only.',
      tramesNom: 'Warped screen',
      tramesNote:
        'A regular screen folded by a smooth field, or two screens laid over each other whose interference is computed point by point, never through transparency.',
      reseauxNom: 'Network',
      reseauxNote:
        'Nodes and edges, drawn to the conventions of a map: lines that turn at fixed angles, stations as dots, interchanges ringed.',
      grammairesNom: 'Grammar',
      grammairesNote:
        'A rule applied to its own result, down to a bounded depth. An axis bears leaflets that bear leaflets.',
      carreauxNom: 'Tile alphabet',
      carreauxNote:
        'A grid of square cells, each holding one sign drawn from a finite set. Two neighbouring quarter discs make a half, four make a circle.',
      couleesNom: 'Flow',
      couleesNote:
        'Thick arcs entering and leaving through the midpoints of a tile’s sides, carrying on from one tile to the next. A ribbon keeps its colour along its whole length.',
      reliefsNom: 'Relief',
      reliefsNote:
        'The colour of a face states its orientation, under a light that never moves. Three well-chosen flats make a cube, without a single gradient.',
      surimpressionsNom: 'Overprint',
      surimpressionsNote:
        'Two inks pulled one over the other, and a third colour wherever they cross, computed channel by channel. The intersection is clipped before it is painted: three opaque flats, no blending.',
      mesuresNom: 'Instruments',
      mesuresNote:
        'The pattern is a tool: cutting mat, graph paper, protractor, test chart. Made of graduations rather than shapes, and the only gesture that writes numbers.',
    },
    couches: {
      arreter: 'Stop the drawing after {couche}',
      fondNom: 'The ground',
      fondNote: 'The palette’s background colour, edge to edge.',
      formesNom: 'The shapes',
      formesNote:
        'The family itself. It is the only layer that changes from one family to the next, and the fifteen gestures that paint it are just above.',
      ombreNom: 'The shade',
      ombreNote:
        'The dark version: a black flat dosed to bring any pattern to the same darkness.',
      voileNom: 'The scrim',
      voileNote:
        'The image pushed towards the label colour, by just as much as it takes, and a little harder at the bottom. Here, {voile}%.',
      grainNom: 'The grain',
      grainNote:
        'A three-level speckle, which breaks the scrim’s steps and keeps the file light.',
      note: 'The dark version inserts a fifth one, the shade, between the shapes and the scrim.',
    },
    sonde: {
      sans: 'no scrim',
      avec: 'automatic scrim',
      luminance: 'Luminance measured under the icons: {n}',
      force: 'Scrim {n}%',
      verdict: 'Readability {niveau}, {contraste}:1',
      seuil: 'AA threshold: 4.5:1',
      note:
        'The measurement is taken on the file’s dimensions, never on the preview’s: a 4K wallpaper does not call for reading a hundred megabytes of pixels back.',
    },
    cadres: {
      taille: '{largeur}\u00a0×\u00a0{hauteur} px',
      pixels: '{n} Mpx',
      choisir: 'See this pattern as {format}',
      sorties:
        'The same drawing comes out as PNG, as a PNG twice as large, as WebP, as SVG, or as three files at once, one per device.',
      vectoriel:
        'The vector export does not copy a single line of the engine: the shapes only know one brush, and a second one exists, which records the paths instead of painting them.',
    },
    appel: {
      titre: 'Your pattern is waiting',
      corps: 'The link carries the four settings, and nothing else.',
      primaire: 'Open this pattern in the app',
      adresse: 'Its address',
      reglages: '{famille}, {palette}, density {densite}, seed {graine}',
    },
  },
  entete: {
    evitement: 'Skip to settings',
    titre: 'Aplat',
    accueil: 'Back to the overview',
    accroche:
      'Generative wallpapers, computed inside your browser. Phone, tablet, computer.',
    mention: 'No account, no network.',
  },
  scene: {
    titre: 'Wallpaper preview',
    alternative:
      'Pattern {famille}, palette {palette}, density {densite}, seed {graine}. Previewed behind a grid of placeholder icons.',
    note: 'Screen mock-up: the clock, widget and icons are placeholders, they are there to judge legibility.',
    alternativeSombre: 'Dark version: the pattern is dimmed inside the file.',
    videTitre: 'Enter a resolution',
    videCorps: 'Width and height in pixels, or go back to detection.',
  },
  lisibilite: {
    titre: 'Icon label legibility',
    attente: 'Nothing to measure until there is an image.',
    bonne: 'good',
    juste: 'borderline',
    insuffisante: 'insufficient',
    libellesClairs: 'light labels',
    libellesSombres: 'dark labels',
    conseilBonne: 'Above the 4.5:1 AA threshold: labels stay crisp across the whole grid.',
    conseilJuste:
      'Below the 4.5:1 AA threshold, above 3:1: a darker palette or a calmer density buys back the margin.',
    conseilInsuffisante: 'Below 3:1: try the Night palette, or a calmer density.',
    voile: 'legibility veil {n}%',
    sansVoile: 'no veil needed',
    titreNiveau: 'Icon label legibility: {niveau}',
    resume: 'Legibility {niveau}, {contraste}:1',
    voileRetire: 'veil removed from the file',
    detail: '{contraste}:1, {libelles}, {voile}. {conseil}',
  },
  reglages: {
    titre: 'Settings',
    famille: 'Pattern family',
    groupeAbstraits: 'Abstract',
    groupePavages: 'Tilings',
    groupeVolumes: 'Volumes',
    groupeInstruments: 'Instruments',
    groupeMatieres: 'Materials',
    groupePaysages: 'Landscapes',
    groupeLieux: 'Places',
    groupeFigures: 'Figures',
    onglets: 'Family groups',
    palette: 'Palette',
    densite: 'Density',
    calme: 'Calm',
    moyen: 'Medium',
    dense: 'Dense',
    version: 'Version',
    versionClaire: 'Light',
    versionSombre: 'Dark',
    versionNote: 'The dark version is dimmed inside the file: that is what you download.',
    versionTitreClaire: 'The pattern as the palette gives it',
    versionTitreSombre: 'The same pattern, dimmed inside the downloaded file',
    mot: 'The word',
    motNote:
      'The poster sets this word, in capitals. Spaces break the lines, and the word repeats until the page is full.',
    ecran: 'Screen',
    ecranAccueil: 'Home',
    ecranVerrou: 'Lock',
    ecranNote:
      'On the lock screen the pattern leaves the top third to the clock; readability is measured there, or under the home screen’s icon grid.',
    ecranTitreAccueil: 'Judge the pattern behind a grid of icons',
    ecranTitreVerrou: 'Judge the pattern behind the lock screen clock',
  },
  palettes: {
    miennes: 'My palettes',
    composer: 'Build a palette',
    modifier: 'Edit {nom}',
    supprimer: 'Delete {nom}',
    nom: 'Palette name',
    nomDefaut: 'My palette',
    fond: 'Background',
    nuancier: 'Colour picker for {nom}',
    teinte: 'Colour {n}',
    ajouterTeinte: 'Add a colour',
    retirerTeinte: 'Remove colour {n}',
    enregistrer: 'Save',
    annuler: 'Cancel',
    bornes: 'The background, then two to five colours. Six colours at most.',
    invalide: 'Six hexadecimal digits per colour, like 17243F.',
    pleine: 'Twelve palettes at most. Delete one to build another.',
    vide: 'No palette built yet. Yours will live here.',
    recue: 'Palette received through the link. Save it to keep it on this device.',
    garder: 'Save the received palette',
    note: 'Kept on this device, in the browser: a name and colours, nothing else.',
  },
  resolution: {
    titre: 'Image resolution',
    surMesure: 'Custom…',
    aucune: 'No resolution',
    largeur: 'Width (px)',
    hauteur: 'Height (px)',
    bornes: 'From 16 to 8000 px.',
    horsBornes: 'Between 16 and 8000 px: that value cannot be produced.',
    detectee: 'detected on this device',
    saisie: 'entered manually',
    telephone: 'Phone',
    tablette: 'Tablet',
    ordinateur: 'Computer',
    presetAppareil: 'This device',
    presetTelephone: 'Phone',
    presetTablette: 'Tablet',
    presetOrdinateur: 'Computer',
    presetUHD: '4K',
  },
  historique: {
    titre: 'Recent patterns',
    vide: 'The patterns you look at land here, ten at most.',
    effacer: 'Clear',
    note:
      'Kept on this device, in the browser: four settings per pattern, no image and no identifier. Pinned ones stay while the rest go by.',
    motif: '{famille}, {palette}, seed {graine}',
    epingler: 'Pin {motif}',
    desepingler: 'Unpin {motif}',
    epingle: 'Pinned',
    epinglerCourt: 'Pin',
    pleines: 'Six pins at most: the list stays a short memory.',
  },
  partage: {
    titre: 'Sharing',
    copier: 'Copy the pattern link',
    copie: 'Link copied',
    echec: 'Copying failed. The link is below, ready to copy by hand.',
    note: 'The link carries the settings, nothing else.',
    graine: 'Seed',
    confidentialite:
      'No account, no network. The last ten patterns are kept on this device, in the browser: four settings each, no image and no identifier, clearable with one button. The palettes you build are kept the same way, a name and colours, deletable one by one. Nothing else is stored; offline, the browser only keeps the application’s own files.',
  },
  preferences: {
    langue: 'Language',
    theme: 'Theme',
    clair: 'Light',
    sombre: 'Dark',
    systeme: 'System',
  },
  barre: {
    nouveau: 'Variation',
    nouveauTitre: 'Redraws the same pattern with a new seed (key V)',
    surprise: 'Surprise me',
    surpriseTitre: 'Draws a random family, palette and seed (key S)',
    telecharger: 'Download',
    rendu: 'Rendering',
    enregistre: 'Image saved',
    ko: 'kB',
    mo: 'MB',
    astuce: 'On a phone: open the downloaded file, then “Save Image”.',
    photos: 'Save to Photos',
    fermer: 'Close',
    erreurTitre: 'Rendering failed',
    erreurTrop: '{mpx} Mpx is more than the browser can produce. Stay under 40 Mpx.',
    erreurGenerale: 'The file could not be created. Please try again.',
    erreurCapacite: 'This device could not produce an image that large. Try a smaller resolution.',
    erreurFormat: 'This browser cannot encode that format. PNG works everywhere.',
    erreurPresse: 'The clipboard refused the image. Download it instead, it is the same file.',
    erreurSvg: 'This pattern holds too many shapes for a useful SVG. PNG stays the right output.',
    reessayer: 'Try again',
    voileInclus: 'The legibility veil is included in the file.',
    voileAbsent: 'The legibility veil is left out of the file.',
    voileNul: 'This file needs no legibility veil.',
    voileRetirer: 'Remove',
    voileRemettre: 'Put back',
    voileTitre: 'The veil darkens the lower image so icon labels hold the threshold',
    formatPngNote: 'The wallpaper, exactly as the preview shows.',
    formatPng2x: 'PNG 2x',
    formatPng2xNote: 'Twice the pixels, for a screen larger than this one.',
    formatWebp: 'WebP',
    formatWebpNote: 'The same image, two to three times lighter, to send it.',
    formatSvg: 'SVG',
    formatSvgNote: 'The pattern as vectors, to reuse elsewhere. Without the grain, which SVG cannot carry.',
    formatSvgDense: 'Unavailable: this pattern holds too many shapes.',
    formatCopie: 'Copy the image',
    formatCopieNote: 'A PNG in the clipboard, ready to paste into a conversation.',
    copiee: 'Image copied',
    formatTrois: 'All three devices',
    formatTroisNote: 'The same seed as phone, tablet and computer, in one go.',
    enregistresTrois: 'Three images saved',
    metaTrois: 'Phone, tablet and computer. PNG, {poids} in total.',
  },
  studio: {
    titre: 'Export',
    fermer: 'Close the sheet',
    format: 'The format',
    taille: 'The size',
    exporter: 'Export',
    syntheseSombre: 'dark version',
    syntheseVoile: 'veil included',
    syntheseVoileNul: 'veil not needed',
    syntheseSansVoile: 'no veil',
  },
  miseAJour: {
    texte: 'A new version of Aplat is ready.',
    action: 'Reload',
    fermer: 'Later',
  },
  pied: {
    moteur: 'How it works',
    source: 'Source code',
    licence: 'AGPL-3.0',
    tiers: 'Third-party licenses',
    soutien: 'Buy me a coffee',
    soutienTitre: 'Support Aplat on Ko-fi. The link opens another site.',
    donnees:
      'No account, no analytics: everything is computed in your browser and never leaves it.',
    hebergement:
      'Hosted by Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, USA, whose servers keep the usual technical logs, IP addresses included.',
  },
  maquette: {
    recherche: 'Search',
    applications: [
      'Camera', 'Notes', 'Maps', 'Music', 'Weather', 'Clock', 'Photos', 'Calendar',
      'Files', 'Settings', 'Podcasts', 'Reminders', 'Books', 'Health', 'Mail', 'Radio',
      'Translate', 'Compass', 'Calculator', 'Voice memo', 'Contacts', 'Atlas', 'Timer', 'Notepad',
    ],
    bureau: ['Documents', 'Pictures', 'Projects', 'Archive', 'Trash'],
    dock: ['Phone', 'Messages', 'Browser', 'Music', 'Settings', 'Trash'],
    menu: ['File', 'Edit', 'View'],
  },
}
