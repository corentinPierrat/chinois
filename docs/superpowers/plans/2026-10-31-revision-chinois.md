# Révision chinois — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A French-language, offline-capable PWA on GitHub Pages for revising the words and rules of 新HSK教程1 lessons 1–8, with four exercises (recognize, write by finger, pinyin/tones, rules).

**Architecture:** Static site, vanilla JS ES modules, no build step. Content lives in one JSON file extracted from the textbook photos. Pure logic (SRS, quiz generation, pinyin parsing, storage) is in small modules tested with `node --test`; views are thin DOM modules switched by a hash router. A service worker precaches everything so the app runs offline.

**Tech Stack:** HTML/CSS/vanilla JS (ES modules), Hanzi Writer 3.7.2 (vendored) + hanzi-writer-data 2.0.1 (per-character JSON, vendored), Web Speech API (`speechSynthesis`, `zh-CN`), `localStorage`, Node 20+ `node --test` for tests, GitHub Pages for hosting.

**Spec:** `docs/superpowers/specs/2026-10-31-revision-chinois-design.md`

## Global Constraints

- UI text in French. Chinese shown in large type (hanzi ≥ 48px on exercise screens).
- Content only from the textbook photos in `photos/` (lessons 1–8) or clearly-added teacher notes. Never invent words, sentences or rules. Unreadable items are omitted and listed in `data/UNCERTAIN.md`.
- Rules not stated in the book may be derived from dialogue patterns; they carry `"derived": true` and all examples are textbook sentences.
- Writing exercise (B) defaults to all 生词 characters except proper nouns, ordered by stroke count ascending.
- Must work on iPhone Safari, installable to home screen, fully offline after first load.
- No accounts, no server, no network calls at runtime besides loading the site itself.
- `photos/` and `.superpowers/` are never committed (copyrighted textbook pages / scratch).
- Repo: `corentinPierrat/chinois` (public), served from `main` branch root via GitHub Pages at `https://corentinpierrat.github.io/chinois/`. All asset paths relative (no leading `/`).
- Deadline: a usable v1 (word list + recognize + write, deployed) before the morning of 2026-11-01.

## Review Focus

1. Tracing a character on iPhone must not scroll or zoom the page → writing grid has `touch-action: none`, viewport disables user scaling. (Task 5 manual check in a mobile-emulated browser.)
2. `localStorage` missing, full, or holding corrupt JSON → app still runs with empty progress. (Task 2 test.)
3. A selection with fewer than 4 candidate words (e.g. one lesson, proper nouns excluded) → distractors are filled from all lessons, never duplicates, never the answer. (Task 2 test.)
4. Words containing non-CJK characters (`AI小语`, punctuation) → writing exercise skips non-CJK chars; pinyin parser ignores them. (Task 2 tests.)
5. A new deploy must reach the phone → service worker cache name is versioned and old caches are deleted on activate. (Task 6 step.)

---

## File Structure

```
index.html                 app shell, loads js/app.js as module
styles.css                 all styles (mobile-first)
manifest.webmanifest       PWA manifest
sw.js                      service worker (versioned precache)
precache.json              generated list of files to precache
icons/icon-192.png, icons/icon-512.png
data/lessons.json          all content (schema below)
data/UNCERTAIN.md          items omitted because unreadable / doubtful
data/hanzi/<char>.json     Hanzi Writer stroke data, one per CJK char used
vendor/hanzi-writer.min.js
js/app.js                  boot: load data, router, render views
js/data.js                 loadData(), selectors
js/storage.js              safe localStorage wrapper
js/srs.js                  Leitner logic
js/quiz.js                 question generation (pure)
js/pinyin.js               pinyin syllable/tone parsing (pure)
js/speech.js               speak(text)
js/views/home.js           lesson picker + mode buttons
js/views/words.js          word list ("fiche")
js/views/recognize.js      exercise A
js/views/write.js          exercise B
js/views/tones.js          exercise C
js/views/rules.js          exercise D (rule cards + reorder + fill gap)
js/views/progress.js       per-lesson progress
scripts/validate-data.mjs  schema + coverage checks, prints gaps
scripts/fetch-hanzi.mjs    downloads data/hanzi/*.json for all chars in lessons.json
scripts/build-precache.mjs writes precache.json
tests/*.test.mjs           node --test
```

## Data schema (`data/lessons.json`)

```json
{
  "lessons":   [{ "id": 1, "title": "AI小语，你好！", "pinyin": "AI Xiǎoyǔ, nǐ hǎo!", "fr": "Bonjour, AI Xiaoyu !" }],
  "words":     [{ "id": "L1-W1", "lesson": 1, "n": 1, "hanzi": "你好", "pinyin": "nǐ hǎo", "pos": "", "en": "hello", "fr": "bonjour", "proper": false, "source": "manuel" }],
  "sentences": [{ "id": "L1-T1-S1", "lesson": 1, "text": 1, "speaker": "王一飞", "hanzi": "AI小语，你好！", "pinyin": "AI Xiǎoyǔ, nǐ hǎo!", "en": "Hello, AI Xiaoyu!", "fr": "Bonjour, AI Xiaoyu !", "tokens": ["AI小语", "，", "你好", "！"] }],
  "rules":     [{ "id": "L8-R1", "lesson": 8, "kind": "grammar", "title": "还没……呢", "structure": "还 + 没 + V + 呢", "fr": "« ne … pas encore »", "explanation": "…", "examples": ["L8-T3-S1"], "derived": true }]
}
```

- Proper nouns: `"id": "L1-P1"`, `"proper": true`, `n` = their own numbering.
- `kind` is `"grammar"` or `"tip"` (小语助力 boxes). `examples` are sentence ids.
- `tokens` = the sentence split into words (joined they equal `hanzi` exactly), punctuation as separate tokens.
- `source` is `"manuel"` or `"notes"`.

---

### Task 1: Scaffold + content extraction

**Files:**
- Create: `.gitignore`, `package.json`, `scripts/validate-data.mjs`, `tests/data.test.mjs`, `data/lessons.json`, `data/UNCERTAIN.md`

**Interfaces:**
- Produces: `data/lessons.json` per schema above; `validate(data) -> { errors: string[], gaps: string[] }` exported from `scripts/validate-data.mjs`.

- [ ] **Step 1:** `git init`, `.gitignore` with `photos/`, `.superpowers/`, `node_modules/`, `.DS_Store`. `package.json` with `"type": "module"`, `"scripts": { "test": "node --test tests/", "validate": "node scripts/validate-data.mjs" }`.
- [ ] **Step 2: Write `tests/data.test.mjs`** — runs `validate()` on `data/lessons.json` and asserts `errors` is empty. Errors: duplicate ids; missing required field; `lesson` not in 1–8; `tokens.join('') !== hanzi`; sentence id in a rule's `examples` not found; for non-proper words, count of CJK chars in `hanzi` ≠ count of pinyin syllables (use `syllables()` from Task 2 only if available — otherwise split pinyin on spaces and count syllables by vowel groups; keep it a warning, not an error). `gaps`: per lesson, missing `n` values in 1..max for words.
- [ ] **Step 3: Extract content (parallel agents).** Split the 36 photos (sorted by filename) into 4 batches of 9. Each agent reads its photos and writes `data/raw/batch-K.json` with the same schema (words, sentences, rules/tips seen on its pages, plus lesson titles), recording exactly what is printed (pinyin with diacritics, English as printed), adding French translations, and listing any doubtful item in an `uncertain` array instead of guessing. Agents also note clear teacher additions from handwriting (`source: "notes"`), ignoring practice scribbles.
- [ ] **Step 4: Merge** batches into `data/lessons.json` (dedupe by id; on conflict, re-read the photo). Then a rules pass: one agent reads all sentences of each lesson and the tips, writes grammar rules (≥1 per lesson where a pattern exists) with `derived: true` unless the book states the rule, examples referencing existing sentence ids. Write `data/UNCERTAIN.md` from `uncertain` arrays + validator `gaps`. Delete `data/raw/`.
- [ ] **Step 5:** `npm test` → PASS; `npm run validate` prints counts per lesson and gaps.
- [ ] **Step 6: Commit** `feat: textbook content for lessons 1-8`.

### Task 2: Core logic modules

**Files:**
- Create: `js/storage.js`, `js/srs.js`, `js/quiz.js`, `js/pinyin.js`, `js/data.js`
- Test: `tests/storage.test.mjs`, `tests/srs.test.mjs`, `tests/quiz.test.mjs`, `tests/pinyin.test.mjs`

**Interfaces:**
- `storage.js`: `load(key, fallback)`, `save(key, value) -> boolean`. Never throws. Accepts an injectable backend: `createStorage(backend = globalThis.localStorage)` returning `{ load, save }`; default export instance.
- `srs.js`: progress shape `{ [itemKey]: { box: 1..5, seen: number, wrong: number, last: number } }`; `itemKey(mode, wordId) -> "mode:wordId"`; `record(progress, key, correct, now = Date.now()) -> progress` (correct → box+1 max 5, wrong → box 1); `pickNext(keys, progress, rng = Math.random) -> key` weighted by `6 - box` (unseen counts as box 0 → weight 6), never returns the last-picked key if more than one key exists.
- `quiz.js`: `makeChoiceQuestion(word, pool, field, rng) -> { word, choices: string[4], answerIndex }` where `field` is `"fr"` or `"pinyin"`; distractors come from `pool` first, then must be supplied by caller fallback `allWords` via `makeChoiceQuestion(word, pool, field, rng, allWords)`; unique values, never equal to the answer. `cjkChars(hanzi) -> string[]` (only `\p{Script=Han}`). `writeQueue(words) -> string[]` unique CJK chars of non-proper words (order of first appearance; sorting by strokes is done in the view once stroke data is loaded). `reorderQuestion(sentence, rng) -> { tokens: string[] (non-punctuation, shuffled, not identical to original if length>1), answer: string[] }`. `gapQuestion(sentence, words, rng) -> { before, after, answer, choices } | null` — blanks a token that equals a non-proper word's hanzi.
- `pinyin.js`: `syllables(pinyin) -> [{ text, base, tone }]` — splits a pinyin string into syllables (handles spaces, apostrophes, capitals, `ü`, punctuation, Latin words like `AI` ignored), `tone` 1–4 from diacritic, 5 for neutral; `base` = syllable without diacritics (lowercase, `ü` kept).
- `data.js`: `loadData(url = "data/lessons.json") -> Promise<Data>`; `wordsFor(data, lessonIds: number[], { includeProper = true }) -> Word[]`; `rulesFor(data, lessonIds)`; `sentence(data, id)`.

- [ ] **Step 1: Write failing tests** with these assertions:
  - storage: backend whose `getItem` throws → `load("k", {a:1})` deep-equals `{a:1}`; backend returning `"{not json"` → fallback; `save` with backend whose `setItem` throws → `false`; `createStorage(undefined)` works.
  - srs: `record({}, "rec:L1-W1", true).["rec:L1-W1"].box === 2`; wrong after box 4 → 1; box never exceeds 5; `pickNext` with rng fixed at 0 and keys `[a,b]` where `a` is box 5 and `b` unseen returns `b`; single key returns it.
  - quiz: `makeChoiceQuestion` with pool of 2 words + allWords of 10 → 4 unique choices, answer at `answerIndex`, answer appears once; duplicate `fr` values in pool don't produce duplicate choices. `cjkChars("AI小语，你好！")` deep-equals `["小","语","你","好"]`. `writeQueue` excludes proper nouns and dedupes. `reorderQuestion` answer equals non-punct tokens in order. `gapQuestion` returns `null` when no token matches a word.
  - pinyin: `syllables("nǐ hǎo")` tones `[3,3]`; `"xièxie"` → `xie/4, xie/5`; `"bú kèqi"` → `[2,4,5]`; `"Wáng lǎoshī"` → bases `["wang","lao","shi"]`; `"nǚ'ér"` → `["nü","er"]`, tones `[3,2]`; `"AI Xiǎoyǔ, nǐ hǎo!"` → 4 syllables (AI skipped); `"zàijiàn"` → `["zai","jian"]`; `"yīshēng"` → `["yi","sheng"]`; `"Zhōngguó"` → `["zhong","guo"]`.
- [ ] **Step 2:** `npm test` → FAIL (modules missing).
- [ ] **Step 3: Implement.** Pinyin splitting of joined words (`xièxie`, `Zhōngguó`): greedy longest match against the standard list of Mandarin syllables (embed the ~410 base syllables as a constant), after stripping diacritics while remembering per-character tone.
- [ ] **Step 4:** `npm test` → PASS. Also run every `words[].pinyin` and `sentences[].pinyin` through `syllables()` in a test and assert none throws and every CJK-only word yields as many syllables as `cjkChars(hanzi).length` (list mismatches in the failure message).
- [ ] **Step 5: Commit** `feat: core logic (storage, srs, quiz, pinyin)`.

### Task 3: App shell, home, word list

**Files:**
- Create: `index.html`, `styles.css`, `js/app.js`, `js/speech.js`, `js/views/home.js`, `js/views/words.js`

**Interfaces:**
- Consumes: `data.js`, `storage.js`.
- Produces: router contract used by all views — each view module exports `render(root: HTMLElement, ctx) -> void | (() => void)` (optional cleanup). `ctx = { data, lessons: number[], navigate(hash), storage, progress, saveProgress() }`. Routes: `#/` home, `#/mots`, `#/reconnaitre`, `#/ecrire`, `#/tons`, `#/regles`, `#/progres`. Selected lessons persisted under storage key `"revchinois.lessons"` (default all 1–8); progress under `"revchinois.progress"`.
- `speech.js`: `speak(text) -> void` — `speechSynthesis` with a `zh-CN` voice if present, rate 0.8; no-op if unsupported. `canSpeak() -> boolean`.

- [ ] **Step 1:** `index.html`: viewport `width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover`, `apple-mobile-web-app-capable`, theme color `#c0392b`, `lang="fr"`, link manifest, `<main id="app">`, `<script type="module" src="js/app.js">`.
- [ ] **Step 2:** Home: title « Révision chinois », lesson chips 1–8 (toggle, plus « Tout »), big buttons for the four modes + « Mots » + « Progrès ». Shows word count for the selection.
- [ ] **Step 3:** Words view: list grouped by lesson — hanzi (large), pinyin, French, English (small, muted), 🔊 button calling `speak(hanzi)`. Proper nouns marked « nom propre ». Back button on every non-home view.
- [ ] **Step 4:** Styles: mobile-first, min tap target 44px, safe-area padding, light/dark via `prefers-color-scheme`, red accent `#c0392b`, CJK font stack `"PingFang SC", "Hiragino Sans GB", "Noto Sans SC", sans-serif`.
- [ ] **Step 5: Verify:** `python3 -m http.server 8000`, open `http://localhost:8000` in a browser at 390×844, home lists 8 lessons, words view shows all words of selected lessons. `npm test` still passes.
- [ ] **Step 6: Commit** `feat: app shell, home and word list`.

### Task 4: Exercise A — Reconnaître

**Files:** Create `js/views/recognize.js`

**Interfaces:** Consumes `wordsFor`, `makeChoiceQuestion`, `pickNext`, `record`, `itemKey("rec", id)` (sens) / `itemKey("recpy", id)` (pinyin variant).

- [ ] **Step 1:** Screen: toggle « Sens / Pinyin », big hanzi, 4 choice buttons. On tap: green for right, red + highlight correct for wrong, 🔊 speaks the word, « Suivant » button (or auto-advance after 1.2s on correct). Counter « x bonnes / y ». Records into progress and saves.
- [ ] **Step 2: Verify** in browser: 10 questions answered, choices unique, progress persisted after reload (inspect `localStorage["revchinois.progress"]`).
- [ ] **Step 3: Commit** `feat: recognize exercise`.

### Task 5: Exercise B — Écrire au doigt

**Files:**
- Create: `scripts/fetch-hanzi.mjs`, `vendor/hanzi-writer.min.js`, `data/hanzi/*.json`, `js/views/write.js`

**Interfaces:** Consumes `writeQueue`, `cjkChars`, srs with `itemKey("write", char)` (progress keyed per character, not per word).

- [ ] **Step 1:** Download `https://cdn.jsdelivr.net/npm/hanzi-writer@3.7.2/dist/hanzi-writer.min.js` to `vendor/`. `fetch-hanzi.mjs` collects every CJK char in `lessons.json` (words + sentences) and downloads `https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0.1/<char>.json` to `data/hanzi/<char>.json`, skipping existing, reporting failures. Run it.
- [ ] **Step 2:** Load Hanzi Writer as a classic script in `index.html` (`vendor/hanzi-writer.min.js`, exposes `HanziWriter`). `charDataLoader: (c) => fetch("data/hanzi/" + encodeURIComponent(c) + ".json").then(r => r.json())`.
- [ ] **Step 3:** Screen: prompt shows French meaning + pinyin of a word containing the char (word context: show the full word with the target char as a blank box); grid ~260px with 米字格 background, `HanziWriter.create(..., { showCharacter: false, showOutline: <toggle>, padding: 8 })` then `writer.quiz({ onMistake, onComplete })`. Buttons: « Indice » (toggle outline), « Voir l'ordre » (`animateCharacter`), « Suivant ». On complete: record correct if total mistakes ≤ 2, else wrong. Order: stroke count ascending (`strokes.length` from loaded data) for the first pass, then `pickNext`. Grid container has `touch-action: none`.
- [ ] **Step 4: Verify** in a mobile-emulated browser (390×844, touch): tracing doesn't scroll the page; a correct trace completes; « Voir l'ordre » animates; chars of `AI小语` exclude `A`/`I`.
- [ ] **Step 5: Commit** `feat: handwriting exercise with stroke order`.

### Task 6: PWA + deploy (v1 milestone)

**Files:** Create `manifest.webmanifest`, `sw.js`, `scripts/build-precache.mjs`, `precache.json`, `icons/icon-192.png`, `icons/icon-512.png`; Modify `js/app.js` (register SW), `package.json` (`"precache": "node scripts/build-precache.mjs"`).

- [ ] **Step 1:** Manifest: `name` « Révision chinois », `short_name` « 中文 », `start_url` `./`, `scope` `./`, `display` `standalone`, theme/background colors, icons. Icons: red square with white 中 (generate with a small script, e.g. Python Pillow or an SVG rendered via `qlmanage`/`sips`; also link `apple-touch-icon`).
- [ ] **Step 2:** `build-precache.mjs` lists every file under `index.html styles.css manifest.webmanifest js/ data/ vendor/ icons/` (relative paths) into `precache.json` with a `version` = hash of contents. `sw.js`: on install, fetch `precache.json`, cache all under `"revchinois-" + version`; on activate, delete other `revchinois-*` caches; fetch: cache-first, fallback network. Register with `navigator.serviceWorker.register("sw.js")`.
- [ ] **Step 3:** Commit, `gh repo create corentinPierrat/chinois --public --source . --push`, enable Pages: `gh api -X POST repos/corentinPierrat/chinois/pages -f "source[branch]=main" -f "source[path]=/"`.
- [ ] **Step 4: Verify:** `curl -sI https://corentinpierrat.github.io/chinois/` → 200 (Pages may take a few minutes); `curl -s .../data/lessons.json | head -c 200` returns JSON; load the site in a browser, then go offline (devtools) and reload → app still works.
- [ ] **Step 5: Commit** any fixes; push.

### Task 7: Exercise C — Pinyin & tons

**Files:** Create `js/views/tones.js`

**Interfaces:** Consumes `syllables`, srs `itemKey("tone", id)`; only words where syllable count == CJK char count.

- [ ] **Step 1:** Screen: big hanzi, below it one slot per syllable showing `base` (e.g. `xie  xie`) and 5 tone buttons per slot (`ā á ǎ à a` rendered with the syllable's main vowel; label « neutre » for 5). 🔊 button. « Vérifier » → each slot green/red, show printed pinyin. All slots right → correct.
- [ ] **Step 2: Verify** in browser with 谢谢 (4,5) and 不客气 (2,4,5).
- [ ] **Step 3:** Rebuild precache, commit `feat: tones exercise`, push.

### Task 8: Exercise D — Règles

**Files:** Create `js/views/rules.js`

**Interfaces:** Consumes `rulesFor`, `sentence`, `reorderQuestion`, `gapQuestion`.

- [ ] **Step 1:** List of rule cards for the selected lessons (title, structure, French explanation, examples with pinyin + French + 🔊, badge « déduite des textes » if `derived`, tips styled differently). Button « S'entraîner ».
- [ ] **Step 2:** Practice: alternates reorder (tap tokens to build the sentence; « Effacer », « Vérifier »; shows French as hint) and fill-gap (sentence with blank + 4 choices) over sentences of the selected lessons, preferring sentences referenced by rules.
- [ ] **Step 3: Verify** in browser for lesson 8; rebuild precache, commit `feat: rules exercise`, push.

### Task 9: Progress screen + final pass

**Files:** Create `js/views/progress.js`; Modify `README.md` (create: one paragraph + URL, how to update content).

- [ ] **Step 1:** Per lesson and per mode: words mastered (box ≥ 4) / seen / total, simple bars; list of the 10 most-missed words with 🔊. « Réinitialiser » with confirm.
- [ ] **Step 2:** Final review subagent over the whole repo against spec + Review Focus; fix findings.
- [ ] **Step 3:** Rebuild precache, `npm test` PASS, commit, push, verify live URL returns 200 and new version loads.
