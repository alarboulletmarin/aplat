<!--
Merci. Ce gabarit est court : ce qui compte est le « pourquoi », le reste se lit dans le diff.
-->

## Ce que ça change

<!-- Pour la personne qui utilise l'application, pas pour le code. -->

## Pourquoi

<!-- Le problème rencontré, et pourquoi cette solution plutôt qu'une autre. -->

## Vérifications

- [ ] `npm run typecheck` passe
- [ ] `npm run test` passe
- [ ] `npm run check` passe, si l'interface ou le moteur a bougé
- [ ] La logique ajoutée au moteur arrive avec ses tests
- [ ] Aucune couleur, taille ou espacement écrit en dur hors des jetons
- [ ] Les libellés ajoutés existent en français **et** en anglais
- [ ] Écran vérifié à 320px : aucun débordement, aucun chevauchement, aucun texte tronqué
- [ ] Cibles tactiles ≥ 44px, focus clavier visible, parcours complet au clavier
- [ ] Toujours un seul appel primaire à l'écran
- [ ] `DESIGN_SYSTEM.md` et `README.md` mis à jour si le comportement décrit a changé

<!-- Si le moteur a changé : joignez les chiffres, poids et netteté se mesurent. -->

## Ce que je n'ai pas vérifié

<!--
Un navigateur que vous n'avez pas, une résolution que vous ne pouvez pas produire,
     un cas que vous n'avez pas su reproduire. Le dire vaut mieux que le laisser deviner.
-->
