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
    },
    ecrans: {
      titre: 'From pocket to desk',
      note: 'Your screen resolution is detected on its own. Or you type your own.',
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
        'Aplat measures the contrast under the icon grid and lays down a scrim, just enough.',
      sansVoile: 'no scrim',
      avecVoile: 'automatic scrim',
    },
    appel: {
      titre: 'Take a seed',
      corps: 'Three choices, one click, one PNG. Your wallpaper is fifteen seconds away.',
    },
    pied: {
      mention: 'Computed in the browser, no data collected',
    },
  },
  entete: {
    evitement: 'Skip to settings',
    titre: 'Aplat',
    accroche:
      'Generative wallpapers, computed inside your browser. Phone, tablet, computer.',
    mention: 'No account, no network.',
  },
  scene: {
    titre: 'Wallpaper preview',
    alternative:
      'Pattern {famille}, palette {palette}, density {densite}, seed {graine}. Previewed behind a grid of placeholder icons.',
    note: 'Screen mock-up: the clock, widget and icons are placeholders, they are there to judge legibility.',
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
    assombri: 'Dimmed',
    assombriTitre: 'Simulates the dimmed background of a dark theme, without changing the file',
    assombriNote:
      'Preview dimmed, roughly as a dark theme would. The downloaded file itself does not change.',
    detail: '{contraste}:1, {libelles}, {voile}. {conseil}',
  },
  reglages: {
    titre: 'Settings',
    famille: 'Pattern family',
    groupeAbstraits: 'Abstract',
    groupePaysages: 'Landscapes',
    groupeFigures: 'Figures',
    palette: 'Palette',
    surprise: 'Surprise me',
    surpriseTitre: 'Draws a random family, palette and seed',
    densite: 'Density',
    calme: 'Calm',
    moyen: 'Medium',
    dense: 'Dense',
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
  },
  historique: {
    titre: 'Recent patterns',
    vide: 'The patterns you look at land here, ten at most.',
    effacer: 'Clear',
    note:
      'Kept on this device, in the browser: four settings per pattern, no image and no identifier.',
    motif: '{famille}, {palette}, seed {graine}',
  },
  partage: {
    titre: 'Sharing',
    copier: 'Copy the pattern link',
    copie: 'Link copied',
    echec: 'Copying failed. The link is below, ready to copy by hand.',
    note: 'The link carries the settings, nothing else.',
    graine: 'Seed',
    confidentialite:
      'No account, no network. The last ten patterns are kept on this device, in the browser: four settings each, no image and no identifier, clearable with one button. Nothing else is stored; offline, the browser only keeps the application’s own files.',
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
    nouveauTitre: 'Redraws the same pattern with a new seed',
    telecharger: 'Download',
    rendu: 'Rendering',
    enregistre: 'Image saved',
    ko: 'kB',
    mo: 'MB',
    astuce: 'On a phone: press and hold the downloaded image, then “Add to Photos”.',
    erreurTitre: 'Rendering failed',
    erreurTrop: '{mpx} Mpx is more than the browser can produce. Stay under 40 Mpx.',
    erreurGenerale: 'The file could not be created. Please try again.',
    erreurCapacite: 'This device could not produce an image that large. Try a smaller resolution.',
    reessayer: 'Try again',
  },
  miseAJour: {
    texte: 'A new version of Aplat is ready.',
    action: 'Reload',
    fermer: 'Later',
  },
  pied: {
    source: 'Source code',
    licence: 'AGPL-3.0',
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
