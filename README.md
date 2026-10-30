# Révision de chinois

Petite PWA (HTML/JS sans build) pour réviser le chinois sur iPhone : mots, reconnaissance, écriture des caractères, pinyin & tons, règles, progression. Une fois publiée : https://corentinpierrat.github.io/chinois/

## Modifier le contenu

1. Éditer `data/lessons.json`.
2. `npm run validate` : vérifie les données.
3. `node scripts/fetch-hanzi.mjs` : pour tout nouveau caractère (données de tracé).
4. `npm run precache` : régénère la liste de cache hors-ligne.
5. `npm test`
6. `git commit` puis `git push`.

`data/UNCERTAIN.md` liste les pages manquantes ou douteuses à re-photographier.
