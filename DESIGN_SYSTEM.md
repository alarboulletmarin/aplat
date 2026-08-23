# Design system

La référence unique de l'interface d'Aplat. Le code s'y réfère section par
section ; une décision visuelle qui n'en découle pas est un défaut, pas un
choix.

Les valeurs vivent dans [`src/styles/tokens.css`](src/styles/tokens.css). Ce
document dit **pourquoi** elles valent ce qu'elles valent.

---

## 1. Ce que l'écran doit faire

**La tâche et sa fin.** La personne arrive pour changer son fond d'écran ; elle
a fini quand l'image est dans sa pellicule, à la bonne taille, et que ses icônes
restent lisibles dessus.

**Le contexte.** Une main, deux minutes, sur téléphone, dans les transports.
Debout, en mouvement, l'écran peut-être en plein soleil.

**La hiérarchie.** Il n'y a qu'un écran.

| Rang | Quoi | Où |
|---|---|---|
| Primaire | le motif derrière de vraies icônes, et **Télécharger** | en haut, épinglé ; le bouton en bas, dans la zone du pouce |
| Secondaire | famille, palette, densité, puis la résolution déjà détectée | le bloc de réglages, sous l'aperçu |
| Caché | langue, thème, lien de partage, version | en bas du bloc, sous un filet |

Un seul appel primaire. **Télécharger** ne partage sa place avec rien : le
bouton secondaire s'efface entièrement quand la largeur manque plutôt que de le
faire rétrécir.

---

## 2. Le parti visuel

Papier découpé, façon Matisse : des aplats francs, aucune ombre portée, un grain
très léger, des coins largement arrondis.

Une **page imprimée**, pas une pile de cartes. Le titre en pleine chasse et un
filet de trois pixels tiennent l'en-tête ; les réglages sont dans un seul bloc
cerné d'un trait franc et découpé par des filets ; les titres sont des titres,
pas de petites capitales interlettrées.

Ce que ce parti exclut, et qui reviendrait tout seul si on n'y prenait pas
garde : les cartes flottantes avec ombre, les libellés minuscules en majuscules
espacées, les formes décoratives posées derrière le titre, les dégradés.

---

## 3. Les couleurs

Une palette de six. Le rapport tient : **un neutre chaud, deux bleus, un acide,
un très sombre**, plus un accent chaud réservé aux aplats.

| Jeton | Valeur | Rôle |
|---|---|---|
| `--lime` | `#DFF478` | l'acide — accent, appel primaire |
| `--creme` | `#F7F3E6` | le neutre chaud |
| `--ciel` | `#92BAD5` | le premier bleu — décor en thème clair |
| `--violet` | `#788CE3` | le second bleu — décor en thème sombre |
| `--navy` | `#17243F` | le très sombre — l'encre |
| `--corail` | `#FF6648` | l'accent chaud |

**Le corail ne porte jamais de texte.** 2,9:1 sur crème : il est réservé aux
aplats et aux formes. Là où une teinte d'alerte doit tenir le 3:1 d'un élément
d'interface — le trait de la carte d'erreur, le triangle de saisie invalide —
c'est `--alerte` qui sert : `#E8481F` en clair, et le corail lui-même en sombre,
où il passe.

### Les jetons d'usage

Jamais une couleur brute dans une règle : toujours un jeton d'usage.

`--fond` `--surface` `--surface-2` `--surface-74` `--champ` `--papier`
`--encre` `--encre-douce` `--filet` `--filet-franc`
`--accent` `--accent-encre` `--deco-1` `--deco-2`
`--lien` `--lien-survol` `--focus` `--alerte`

### Le sombre n'est pas une inversion

Les aplats sont repensés :

- le fond descend à `#0E1729`, plus bas que la simple négation du crème, pour
  que la surface `#17243F` s'en détache ;
- `--deco-1` passe du bleu clair au bleu-violet : le bleu clair, sur un fond
  sombre, n'est plus une couleur froide mais une couleur claire ;
- `--filet-franc` descend de `.56` à `.46` : sur fond sombre un trait clair
  paraît plus appuyé à opacité égale ;
- `--focus` passe du bleu au lime, qui est le seul à tenir sur les deux surfaces ;
- l'accent, lui, ne bouge pas. C'est la constante qui fait reconnaître l'appel
  primaire d'un thème à l'autre.

---

## 4. Typographie

Deux familles, un contraste franc entre les deux.

| Rôle | Famille | Où |
|---|---|---|
| Display | **Anton** (`--display`) | le titre, le quantième de la maquette |
| Texte | **Archivo** (`--texte`) | tout le reste |

Les deux sont auto-hébergées (`public/polices/`) et découpées en deux sous-
ensembles Unicode chacune : rien ne part vers un CDN, et le latin étendu n'est
téléchargé que s'il sert.

Le titre : `clamp(56px, 15.5vw, 98px)`, interligne `.76`, interlettrage
`-.045em`, en capitales. Presque collé — c'est le seul geste typographique de la
page, et il ne se répète nulle part ailleurs.

Échelle du texte courant : 12,5 · 13 · 13,5 · 14 · 14,5 · 15 · 16 · 16,5 px.
Les titres de section sont à 16,5 px en gras, avec `-.012em` d'interlettrage.

---

## 5. Formes, rayons, filets

Coins largement arrondis, jamais uniformes : le rayon suit la taille de
l'objet.

| Objet | Rayon |
|---|---|
| bloc de réglages | 26 px |
| bouton d'action | 18 px |
| puce de choix, champ, select | 13 à 15 px |
| note | 18 à 20 px |
| appareil de la maquette | 13 % du petit côté (téléphone), 5,5 % (tablette), 2,4 % (ordinateur) |

Filets : 3 px sous le titre, 2 px pour le contour du bloc et ses séparations,
1,5 px pour le trait d'une puce au repos, 2,5 px pour signaler une erreur.

### Le vocabulaire décoratif

Blobs, vagues, marguerites, étoiles à pointes, arches. **Ils habillent et
repèrent, ils ne portent jamais d'information seule** : l'arche du groupe
« Abstraits » et l'étoile du groupe « Figures » accompagnent un mot, elles ne le
remplacent pas.

Les pictogrammes sont dessinés dans la direction artistique, en CSS, à partir de
formes pleines et de `clip-path` — ni Material, ni Lucide, **jamais d'emoji**.

---

## 6. Gabarits

Mobile d'abord. Une colonne sous 760 px, deux au-delà — l'aperçu à gauche, les
réglages à droite, tous deux visibles en même temps.

L'aperçu est **collant en haut** sur téléphone et la barre d'action **collante
en bas** : on règle au milieu, on juge au-dessus, on termine en dessous, sans
aller-retour. Les deux hauteurs sont publiées en variables CSS (`--scene-h`,
`--barre-h`) pour que la réserve de défilement les suive.

Les grilles sont en `repeat(auto-fit, minmax(min(Xpx, 100%), 1fr))`. Le
`min(…, 100%)` n'est pas décoratif : sans lui, la piste minimale force une
largeur plus grande que l'écran sous 336 px et la page défile
horizontalement.

Pas de navigation : il n'y a qu'une section.

---

## 7. Les composants

### La puce de choix

Les cinq groupes de réglage sont à choix unique et exclusif : ce sont des
**boutons radio**, pas des bascules. `role="radio"`, `aria-checked`, un seul
arrêt de tabulation par groupe, les flèches déplacent le choix.

La sélection est un **aplat inversé** — encre pleine, texte papier — et non une
nuance : un aplat se lit de loin, en niveaux de gris, sans comparer deux teintes
voisines. Le petit carré lime confirme, il ne décide pas ; il porte un filet à la
couleur du texte, sans quoi il disparaîtrait sur la puce crème du thème sombre.

### Les champs

Trait `--filet-franc` à 1,5 px, fond `--champ`, chiffres en `tabular-nums`.
En erreur : trait `--alerte` à 2,5 px **et** un triangle devant le message. La
teinte seule ne suffit jamais.

### Les boutons

- **Primaire** : aplat `--accent`, texte `--accent-encre`, trait
  `--accent-encre` — et non `--encre`, qui est la crème en thème sombre et
  disparaîtrait sur le lime. 56 px de haut.
- **Secondaire** : transparent, trait `--encre` à 2 px. 56 px, mais
  `flex: 0 100 auto` : il cède toute sa place au primaire.

### Les notes

Trois formes, jamais trois couleurs :

| Note | Signe | Fond |
|---|---|---|
| succès | pointe vers le bas et son seuil | `--accent` |
| erreur | triangle | `--surface`, trait `--alerte` |
| mise à jour | arche | `--surface`, trait `--filet-franc` |

---

## 8. Les états

Chaque écran a cinq états, tous dessinés.

| État | Ce qu'on voit |
|---|---|
| **Vide** | hachure diagonale à la place de la maquette, « Indique une résolution », bouton désactivé |
| **Chargement** | trois points au centre, bouton en « Rendu en cours » et `aria-busy` |
| **Erreur** | carte à trait d'alerte et triangle, **la cause exacte**, bouton Réessayer |
| **Succès** | carte lime : dimensions, format, poids réel, et le geste pour finir |
| **Données trop longues** | ellipse sur les puces et les icônes de la maquette, retour à la ligne dans les cartes, `overflow-wrap` sur les valeurs, rangées retirées de la maquette |

Le verdict de lisibilité est affiché **en permanence**, pas seulement en cas de
problème. Et il n'affiche rien tant qu'il n'a rien mesuré : une application qui
promet de mesurer la lisibilité n'affiche pas un chiffre de repli.

---

## 9. Accessibilité — non négociable

- **Contrastes** : 4,5:1 pour le texte courant, 3:1 pour le texte large, les
  bordures d'éléments d'interface et les formes porteuses de sens.
- **Jamais la couleur seule.** En niveaux de gris, tout reste lisible : la
  sélection est un aplat inversé, la densité un nombre de points allumés, la
  lisibilité trois formes distinctes (disque plein, demi-disque, triangle), le
  thème un disque plein, vide ou à moitié, l'erreur un triangle.
- **Cibles tactiles 44 px**, sans exception — y compris le lien vers la source
  dans le pied de page.
- **Actions fréquentes dans la zone du pouce** : la barre d'action est en bas.
- **Focus visible partout**, et jamais masqué par les deux barres collantes.
  `scroll-padding` n'étant appliqué ni par le défilement déclenché par le focus
  ni par `scrollIntoView`, la correction se fait sur `focusin`
  (WCAG 2.2, 2.4.11).
- **Régions live** sur le verdict de lisibilité, le résultat de l'export et la
  confirmation de copie — et rien n'y est réécrit quand rien ne change.
- **La maquette d'écran est `aria-hidden`** : un lecteur d'écran n'a pas à lire
  de faux noms d'application. L'aperçu, lui, porte une description de ce qu'il
  montre.

---

## 10. Mouvement

Une animation ne sert que si elle dit **une origine, un état ou une
continuité**. Il y en a deux :

- le fondu de l'aperçu quand le motif change — il dit « c'est une autre
  image », et il se tait quand seule la fenêtre a bougé ;
- les trois points pendant le calcul — ils disent « c'est en cours ».

`prefers-reduced-motion: reduce` les coupe toutes les deux.

---

## 11. Deux langues

FR et EN, à parité stricte : la clé qui manque d'un côté ne compile pas. Les
gabarits laissent **30 % de marge** — vérifié en allongeant chaque libellé
d'autant, sur huit largeurs et quatre résolutions cibles.

Selon l'endroit, un libellé long revient à la ligne (puces), replie sa rangée
(langue, thème), s'étire avec sa colonne (cartes) ou s'élide (icônes de la
maquette, bouton secondaire). Le libellé du bouton primaire, lui, ne s'élide ni
ne se coupe jamais.

Espaces insécables dans les chaînes françaises devant `%`, `:` et à l'intérieur
des guillemets.

---

## 12. Ce que le design refuse

- Dark patterns, fausse urgence, frictions asymétriques.
- Gamification : ni badge, ni série, ni barre de progression culpabilisante.
- Onboarding en modales, tour guidé, pop-up de bienvenue.
- Plus d'un appel primaire par écran.
- Emoji.
- Bibliothèque de composants ou de style.
- Une deuxième section.
