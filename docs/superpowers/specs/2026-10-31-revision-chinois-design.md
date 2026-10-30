# Révision chinois : PWA de révision pour 新HSK教程1 (leçons 1 à 8)

Date : 2026-10-31
Examen : vendredi 2026-11-06

## Intention

Corentin a un examen de chinois vendredi. Il veut une appli sur son téléphone pour réviser **uniquement ce qu'il a vu en classe** : les mots et les règles des leçons 1 à 8 du manuel *新HSK教程1 / New HSK Course 1* (外语教学与研究出版社, édition 2026, alignée sur le nouveau HSK). Les listes de vocabulaire HSK génériques trouvées en ligne ne conviennent pas, parce qu'elles ne correspondent pas à cette édition.

L'examen mélange : écrire des caractères simples à la main, reconnaître des caractères, et (probablement) pinyin, tons et phrases. Les quatre exercices ci-dessous comptent tous.

## Ce qui compte

- Une première version utilisable **le dimanche 1er novembre au plus tard**, pour avoir toute la semaine de révision. La vitesse prime sur le fini.
- Le contenu doit être **fidèle au manuel**. Un mot faux ou inventé est pire qu'un mot manquant.
- L'appli fonctionne sur iPhone (Safari), est installable sur l'écran d'accueil, et marche hors ligne.
- On ajoutera des fonctions au fur et à mesure (dit par Corentin) : le code doit rester simple à faire évoluer.

## Non-objectifs

- Pas de comptes, pas de serveur, pas de synchronisation entre appareils.
- Pas d'autre contenu que les leçons 1 à 8 pour l'instant (la structure doit quand même permettre d'ajouter des leçons).
- Pas de traduction automatique ou de contenu généré à la volée.

## Anti-objectifs (échec même si « ça marche »)

- Des mots ou des règles qui ne sont pas dans le manuel ou dans ses notes de cours.
- Une appli pénible sur téléphone (petits boutons, zoom involontaire, défilement qui gêne le tracé au doigt).
- Une première version qui arrive trop tard pour réviser.

## Source du contenu

36 photos du manuel dans `photos/` (JPEG WhatsApp, lisibles), couvrant les leçons 1 à 8. Chaque leçon contient 3 ou 4 « 课文 » (textes), chacun avec un encadré **生词 New Words** : numéro, caractères, pinyin, nature (n., v., adj., …), traduction anglaise. Il y a aussi des **专有名词** (noms propres, ex. 王老师, 胡医生), des encadrés **小语助力 / Xiaoyu's Tip** (points de langue ou de culture), des dialogues avec pinyin et traduction, et des exercices. Certaines pages contiennent des notes manuscrites de Corentin.

Volume estimé : environ 20 à 25 mots par leçon, soit environ 180 mots plus les noms propres.

Extraction (faite par Claude en lisant les photos) vers un fichier de données versionné, par exemple `data/lessons.json` :

- **Mot** : leçon, numéro dans la leçon, hanzi, pinyin (avec diacritiques, tel qu'imprimé), nature, anglais (tel qu'imprimé), français (traduit par Claude), drapeau « nom propre ».
- **Phrases** : les lignes de dialogue des textes (hanzi, pinyin, traduction). Elles alimentent les exercices de phrases.
- **Règles** : les points de grammaire et les encadrés Xiaoyu's Tip trouvés dans les photos, plus ce qui ressort des notes manuscrites. Chaque règle a une explication courte en français, une structure (ex. `还 + 没 + V + 呢`) et 1 à 3 exemples **tirés du manuel**.
- Tout mot ou passage illisible est marqué comme incertain et listé à Corentin, sans être deviné.

## Les quatre exercices

Pour tous : on choisit une leçon, plusieurs, ou « tout ». Interface en français, gros caractères, boutons faciles à toucher.

**A · Reconnaître** : on affiche le hanzi, Corentin choisit le sens parmi 4 propositions. Les distracteurs viennent d'autres mots des leçons choisies. Variante : choisir le pinyin.

**B · Écrire au doigt** : on affiche le sens français et le pinyin, Corentin trace le caractère au doigt dans une grille. L'ordre et la direction des traits sont vérifiés. En cas d'erreur, le bon trait est montré. Boutons « indice » et « voir l'ordre des traits » (animation). Les mots de plusieurs caractères sont écrits caractère par caractère. Bibliothèque prévue : **Hanzi Writer** (gratuite, données d'ordre des traits incluses). Les données des caractères doivent marcher hors ligne.

**C · Pinyin et tons** : on affiche le hanzi, Corentin retrouve le pinyin avec les tons (par exemple en choisissant le ton de chaque syllabe). Bouton « écouter », avec la synthèse vocale chinoise du navigateur (`speechSynthesis`, zh-CN), sans fichiers audio.

**D · Règles** : une fiche par règle (explication, structure, exemples), puis des mini-exercices tirés des phrases du manuel : remettre les mots dans l'ordre, compléter un trou.

Une maquette de ces quatre écrans a été validée par Corentin (voir `.superpowers/brainstorm/`).

## Progression

- Chaque réponse est enregistrée localement (`localStorage`), par mot et par exercice.
- Les mots ratés reviennent plus souvent (système simple de type Leitner : bien trouvé → boîte suivante, raté → boîte 1).
- Un petit écran montre par leçon combien de mots sont acquis ou à revoir. Une liste consultable de tous les mots (hanzi, pinyin, sens, écouter) sert aussi de « fiche » de révision.

## Réponses aux questions du relecteur

Corentin a répondu « tout est bon » aux propositions suivantes :

- **Couverture** : les 36 photos sont considérées comme la source complète. L'extraction vérifie que les numéros de 生词 de chaque leçon se suivent sans trou, et signale toute lacune à Corentin (qui pourra reprendre une photo) sans bloquer la v1.
- **Règles (exercice D)** : si le manuel n'a pas de section de grammaire explicite dans les photos, les règles peuvent être **déduites des structures qui reviennent dans les dialogues du manuel** (ex. `还 + 没 + V + 呢`). Elles sont alors marquées « déduites des textes ». Tous les exemples restent des phrases du manuel.
- **Écriture (exercice B)** : par défaut, tous les caractères des 生词, **sauf les noms propres**, du plus simple (peu de traits) au plus complexe.

Décisions de Claude, validées implicitement :

- Les éléments illisibles ou incertains sont **laissés de côté dans la v1** et listés à Corentin. Ils seront ajoutés après confirmation.
- Les notes manuscrites ne servent que si elles ajoutent clairement un mot ou une explication du prof (champ `source: "notes"`). Les essais d'écriture sont ignorés.

## Décisions de Claude (Corentin ne les a pas discutées, il les a acceptées en bloc)

- PWA statique hébergée sur **GitHub Pages** (Corentin a accepté). Compte GitHub : `corentinPierrat`, `gh` est déjà connecté sur la machine.
- Hanzi Writer pour l'écriture, `speechSynthesis` pour l'audio, `localStorage` pour la progression.
- Traductions françaises faites par Claude, l'anglais du manuel restant visible en dessous.

## Laissé au builder

- Le choix de la stack (vanilla JS sans build ou petit outil de build) et la structure du code, du moment que le déploiement sur GitHub Pages reste simple.
- Le style visuel (sobre, lisible, rappel discret du rouge du manuel bienvenu).
- La stratégie hors ligne (service worker, mise en cache des données Hanzi Writer pour les caractères des leçons 1 à 8).
- L'ordre de livraison, avec une contrainte : une version utile au plus vite (liste de mots + A + B en priorité, puis C, puis D), plutôt que tout en même temps.
