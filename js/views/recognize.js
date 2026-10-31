import { wordsFor } from "../data.js";
import { makeChoiceQuestion } from "../quiz.js";
import { itemKey, record, pickNext, remaining } from "../srs.js";
import { speak, canSpeak } from "../speech.js";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export function render(root, ctx) {
  const pool = wordsFor(ctx.data, ctx.lessons);
  const bar = (extra = "") => `<div class="bar"><button class="back">‹ Retour</button><h2>Reconnaître</h2>${extra}</div>`;
  if (!pool.length) {
    root.innerHTML = bar() + `<p class="empty">Aucune leçon sélectionnée.</p>`;
    root.querySelector(".back").onclick = () => ctx.navigate("#/");
    return;
  }
  const byId = new Map(pool.map((w) => [w.id, w]));
  let mode = "rec"; // "rec" = sens, "recpy" = pinyin
  let good = 0, total = 0, last = null, q = null, answered = false, timer = null;
  const done = new Set(); // keys answered correctly this session

  const clear = () => { if (timer) { clearTimeout(timer); timer = null; } };

  function next() {
    clear();
    const keys = pool.map((w) => itemKey(mode, w.id));
    const key = pickNext(remaining(keys, done), ctx.progress, Math.random, last);
    last = key;
    const word = byId.get(keyId(key));
    q = makeChoiceQuestion(word, pool, mode === "rec" ? "fr" : "pinyin", Math.random, ctx.data.words);
    answered = false;
    draw();
  }
  // key format is "mode:id"; ids may be numeric or string
  function keyId(key) {
    const raw = key.slice(key.indexOf(":") + 1);
    return byId.has(raw) ? raw : Number(raw);
  }

  function draw() {
    const w = q.word;
    root.innerHTML = bar(`<span class="score" aria-live="polite">${good} bonnes / ${total}</span>`) +
      `<div class="seg" role="group"><button data-mode="rec" aria-pressed="${mode === "rec"}">Sens</button><button data-mode="recpy" aria-pressed="${mode === "recpy"}">Pinyin</button></div>
      <div class="prompt${[...w.hanzi].length > 3 ? " long" : ""}"><span class="hanzi">${esc(w.hanzi)}</span>${canSpeak() ? `<button class="speak" data-speak aria-label="Écouter">🔊</button>` : ""}</div>
      <div class="choices">${q.choices.map((c, i) => `<button class="choice" data-i="${i}">${esc(c)}</button>`).join("")}</div>
      <div class="foot"></div>`;
  }

  function answer(i) {
    if (answered) return;
    answered = true;
    const ok = i === q.answerIndex;
    total++; if (ok) good++;
    ctx.progress = record(ctx.progress, itemKey(mode, q.word.id), ok, Date.now());
    if (ok) done.add(itemKey(mode, q.word.id));
    ctx.saveProgress();
    const btns = root.querySelectorAll(".choice");
    btns[q.answerIndex].classList.add("ok");
    if (!ok) btns[i].classList.add("bad");
    root.querySelector(".choices").classList.add("done");
    root.querySelector(".score").textContent = `${good} bonnes / ${total}`;
    speak(q.word.hanzi);
    root.querySelector(".foot").innerHTML = `<button class="next">Suivant ›</button>`;
    if (ok) timer = setTimeout(next, 1200);
  }

  root.onclick = (e) => {
    const t = e.target;
    if (t.closest(".back")) { clear(); return ctx.navigate("#/"); }
    const m = t.closest("[data-mode]");
    if (m) { if (m.dataset.mode !== mode) { mode = m.dataset.mode; last = null; next(); } return; }
    if (t.closest("[data-speak]")) return speak(q.word.hanzi);
    const c = t.closest(".choice");
    if (c) return answer(Number(c.dataset.i));
    if (t.closest(".next")) next();
  };
  next();
  return () => { clear(); root.onclick = null; };
}
