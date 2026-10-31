import { wordsFor } from "../data.js";
import { syllables, markTone } from "../pinyin.js";
import { cjkChars } from "../quiz.js";
import { itemKey, record, pickNext, remaining } from "../srs.js";
import { speak, canSpeak } from "../speech.js";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export function render(root, ctx) {
  const pool = wordsFor(ctx.data, ctx.lessons).filter((w) => {
    const n = cjkChars(w.hanzi).length;
    return n > 0 && syllables(w.pinyin).length === n;
  });
  const bar = (extra = "") => `<div class="bar"><button class="back">‹ Retour</button><h2>Pinyin &amp; tons</h2>${extra}</div>`;
  if (!pool.length) {
    root.innerHTML = bar() + `<p class="empty">Aucune leçon sélectionnée.</p>`;
    root.querySelector(".back").onclick = () => ctx.navigate("#/");
    return;
  }
  const byId = new Map(pool.map((w) => [String(w.id), w]));
  let good = 0, total = 0, last = null, word = null, syl = [], picks = [], checked = false, timer = null;
  const done = new Set(); // keys answered correctly this session

  const clear = () => { if (timer) { clearTimeout(timer); timer = null; } };
  const askable = (s) => s.base !== "r";

  function next() {
    clear();
    const key = pickNext(remaining(pool.map((w) => itemKey("tone", w.id)), done), ctx.progress, Math.random, last);
    last = key;
    word = byId.get(key.slice(key.indexOf(":") + 1));
    syl = syllables(word.pinyin);
    picks = syl.map(() => null);
    checked = false;
    draw();
  }

  function draw() {
    const long = syl.length > 3;
    root.innerHTML = bar(`<span class="score" aria-live="polite">${good} bonnes / ${total}</span>`) +
      `<div class="prompt${[...word.hanzi].length > 3 ? " long" : ""}"><span class="hanzi">${esc(word.hanzi)}</span>${canSpeak() ? `<button class="speak" data-speak aria-label="Écouter">🔊</button>` : ""}</div>
      <div class="tslots${long ? " tight" : ""}">${syl.map((s, i) => `<div class="tslot" data-slot="${i}">
        <div class="tbase">${esc(s.base)}</div>
        ${askable(s)
          ? [1, 2, 3, 4, 5].map((t) => `<button class="tbtn" data-slot="${i}" data-tone="${t}" aria-pressed="false"${t === 5 ? ' aria-label="neutre"' : ""}>${t === 5 ? `${esc(s.base)}<small>neutre</small>` : esc(markTone(s.base, t))}</button>`).join("")
          : `<div class="tfixed">neutre</div>`}
      </div>`).join("")}</div>
      <div class="tpy" aria-live="polite"></div>
      <div class="foot"><button class="next verify" disabled>Vérifier</button></div>`;
    update();
  }

  function update() {
    root.querySelectorAll(".tbtn").forEach((b) => {
      b.setAttribute("aria-pressed", String(picks[Number(b.dataset.slot)] === Number(b.dataset.tone)));
    });
    const v = root.querySelector(".verify");
    if (v) v.disabled = syl.some((s, i) => askable(s) && picks[i] == null);
  }

  function verify() {
    if (checked) return;
    checked = true;
    let all = true;
    syl.forEach((s, i) => {
      const slot = root.querySelector(`.tslot[data-slot="${i}"]`);
      if (!askable(s)) return;
      const ok = picks[i] === s.tone;
      if (!ok) all = false;
      slot.querySelectorAll(".tbtn").forEach((b) => {
        const t = Number(b.dataset.tone);
        if (t === s.tone) b.classList.add("ok");
        else if (t === picks[i]) b.classList.add("bad");
      });
      slot.classList.add(ok ? "good" : "wrong");
    });
    total++; if (all) good++;
    ctx.progress = record(ctx.progress, itemKey("tone", word.id), all, Date.now());
    if (all) done.add(itemKey("tone", word.id));
    ctx.saveProgress();
    root.querySelector(".score").textContent = `${good} bonnes / ${total}`;
    root.querySelector(".tslots").classList.add("done");
    root.querySelector(".tpy").innerHTML = `<span class="${all ? "pyok" : "pybad"}">${all ? "Correct" : "Raté"}</span> ${esc(word.pinyin)}`;
    speak(word.hanzi);
    root.querySelector(".foot").innerHTML = `<button class="next">Suivant ›</button>`;
    if (all) timer = setTimeout(next, 1800);
  }

  root.onclick = (e) => {
    const t = e.target;
    if (t.closest(".back")) { clear(); return ctx.navigate("#/"); }
    if (t.closest("[data-speak]")) return speak(word.hanzi);
    const b = t.closest(".tbtn");
    if (b) {
      if (checked) return;
      picks[Number(b.dataset.slot)] = Number(b.dataset.tone);
      return update();
    }
    if (t.closest(".verify")) return verify();
    if (t.closest(".next")) next();
  };
  next();
  return () => { clear(); root.onclick = null; };
}
