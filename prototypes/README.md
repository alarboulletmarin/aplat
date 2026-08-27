# Prototypes : le flux d'export

Ce dossier est un banc d'essai, pas du produit. Il ne fait pas partie du build
(Vite ne construit que `index.html`), il n'est pas déployé, et tout ce qu'il
contient a vocation à disparaître une fois la décision prise.

## La question posée

Le dépli « Autres sorties » de la barre d'action est aujourd'hui un disclosure
non modal. La proposition à éprouver : une bottom sheet modale (voile grisé,
poignée, renvoi au geste), éventuellement élargie à toute la configuration
d'export, ou un menu d'actions ancré. L'objectif du flux, quelle que soit la
variante : de la configuration à l'export en quelques gestes, pour tous les
cas, sans friction.

## Les maquettes (phase A)

`maquettes-export.html` est une page autonome : aucune dépendance, aucun build.

- Servie par le projet : `npm run dev` puis
  `http://localhost:5173/prototypes/maquettes-export.html`
  (ajouter `-- --host` pour la tester au téléphone sur le réseau local).
- Ouverte en fichier local ou publiée ailleurs : elle retombe sur les polices
  de repli, tout le reste fonctionne.

Quatre variantes derrière le commutateur du haut :

| Variante | Pattern | Ce qu'elle éprouve |
|---|---|---|
| Témoin | disclosure dans la barre (actuel, plus fermeture au tap extérieur) | la référence à battre |
| Feuille basse | bottom sheet modale, sorties seules | le plan isolé : scrim, poignée, renvoi au geste |
| Studio | bottom sheet modale, toute la configuration d'export | le scénario complet sans quitter la feuille |
| Studio seul | barre à trois boutons, la feuille porte l'appel primaire | l'épure maximale, au prix du PNG courant à 2 gestes |
| Menu | menu ancré au déclencheur, sans scrim | la sémantique menu, au doigt et au clavier |

Le panneau « Scénarios » force les états non nominaux (SVG ou WebP
indisponible, résolution vide, image trop grande, erreur au rendu) et liste
les missions à chronométrer. Le compteur de gestes, en haut à droite, se remet
à zéro à chaque changement de variante ou d'état.

## L'implémentation in-app (phase B)

Les deux philosophies retenues sont implémentées dans l'application, derrière
un paramètre d'adresse lu au chargement et jamais partagé dans les liens :

- `/app?proto=feuille` : la feuille basse modale, sorties seules.
- `/app?proto=studio` : le studio d'export complet, derrière le chevron.
- `/app?proto=trio` : la barre à trois boutons, le studio comme unique porte
  de sortie et appel primaire.
- `/app` sans paramètre : le comportement actuel, strictement inchangé.

Là, tout est réel : moteur, encodage, téléchargements, feuille de partage
native, clavier virtuel.

## La grille de jugement

À remplir par variante, sur téléphone réel de préférence :

| Critère | Mesure |
|---|---|
| Gestes | du premier geste au fichier obtenu : PNG ; WebP ; sur mesure + sombre + sans voile ; les trois appareils |
| Zones de regard | combien de régions d'écran le scénario traverse (barre, panneau, feuille) |
| Attention | combien d'éléments réclament le regard pendant l'ouverture (seuil : deux ou trois) |
| Atteignabilité | toutes les cibles du scénario dans la zone du pouce, 44 px minimum |
| Cas non nominaux | la raison d'une sortie indisponible se lit avant l'appui ; l'erreur dit quoi corriger |
| Symétrie de sortie | fermer est aussi simple qu'ouvrir : voile, glissement, Échap, chevron |
| Clavier et lecteur d'écran | Tab entre, le piège tient (variantes modales), Échap sort, le focus revient au chevron |
| Clavier virtuel | pendant une saisie sur mesure, le champ reste visible au-dessus du clavier |

Verdict attendu : une variante gagne sur le scénario complet sans dégrader le
PNG à un geste ni les cas d'échec. « Le témoin gagne » est un verdict
recevable, et il se note ici avec ses mesures, comme les autres.

## Ce que les variantes modales dérogent au design system

`DESIGN_SYSTEM.md` refuse les modales et le produit n'a aujourd'hui ni scrim,
ni piège à focus, ni `role="dialog"`. Les prototypes transgressent cette règle
en connaissance de cause : c'est précisément elle que le test doit confirmer
ou renverser. La décision finale, quelle qu'elle soit, se prend après mesure,
et s'écrit dans le design system, pas seulement dans le code.
