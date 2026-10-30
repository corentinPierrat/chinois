const HAN = /\p{Script=Han}/u;
const PUNCT = /^[\p{P}\p{S}\s]+$/u;

export const cjkChars = (hanzi) => [...hanzi].filter((c) => HAN.test(c));

function shuffle(arr, rng) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function distractors(answer, sources, field, rng, n) {
  const out = [];
  const seen = new Set([answer]);
  for (const list of sources) {
    for (const w of shuffle(list, rng)) {
      const v = w[field];
      if (v && !seen.has(v)) { seen.add(v); out.push(v); if (out.length === n) return out; }
    }
  }
  return out;
}

export function makeChoiceQuestion(word, pool, field, rng = Math.random, allWords = pool) {
  const answer = word[field];
  const ds = distractors(answer, [pool, allWords], field, rng, 3);
  const choices = shuffle([answer, ...ds], rng);
  return { word, choices, answerIndex: choices.indexOf(answer) };
}

export function writeQueue(words) {
  const out = [];
  const seen = new Set();
  for (const w of words) {
    if (w.proper) continue;
    for (const c of cjkChars(w.hanzi)) if (!seen.has(c)) { seen.add(c); out.push(c); }
  }
  return out;
}

const wordTokens = (sentence) => sentence.tokens.filter((t) => !PUNCT.test(t));

export function reorderQuestion(sentence, rng = Math.random) {
  const answer = wordTokens(sentence);
  let tokens = shuffle(answer, rng);
  if (answer.length > 1) {
    const same = (t) => t.every((x, i) => x === answer[i]);
    const distinct = new Set(answer).size > 1;
    for (let i = 0; distinct && same(tokens) && i < 50; i++) tokens = shuffle(answer, rng);
    if (distinct && same(tokens)) tokens = [...answer.slice(1), answer[0]];
  }
  return { tokens, answer };
}

export function gapQuestion(sentence, words, rng = Math.random, allWords = words) {
  const known = new Map();
  for (const w of words) if (!w.proper) known.set(w.hanzi, w);
  const idxs = sentence.tokens.map((t, i) => (known.has(t) ? i : -1)).filter((i) => i >= 0);
  if (!idxs.length) return null;
  const i = idxs[Math.floor(rng() * idxs.length)];
  const answer = sentence.tokens[i];
  const ds = distractors(answer, [words.filter((w) => !w.proper), allWords.filter((w) => !w.proper)], "hanzi", rng, 3);
  return {
    before: sentence.tokens.slice(0, i).join(""),
    after: sentence.tokens.slice(i + 1).join(""),
    answer,
    choices: shuffle([answer, ...ds], rng),
  };
}
