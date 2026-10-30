import { rulesFor, sentence, wordsFor } from "../data.js";
import { reorderQuestion, gapQuestion } from "../quiz.js";
import { speak, canSpeak } from "../speech.js";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const PUNCT = /^[\s，。！？、；：,.!?;:"'“”‘’（）()…—·]+$/;

export function render(root, ctx) {
  const rules = rulesFor(ctx.data, ctx.lessons);
  const bar = (extra = "") => `<div class="bar"><button class="back">‹ Retour</button><h2>Règles</h2>${extra}</div>`;
  if (!rules.length) {
    root.innerHTML = bar() + `<p class="empty">Aucune règle pour les leçons sélectionnées.</p>`;
    root.querySelector(".back").onclick = () => ctx.navigate("#/");
    return;
  }
  const words = wordsFor(ctx.data, ctx.lessons);
  const lessonSents = ctx.data.sentences.filter((s) => ctx.lessons.includes(s.lesson));
  const ruleSents = [...new Set(rules.flatMap((r) => r.examples || []))]
    .map((id) => sentence(ctx.data, id)).filter((s) => s && ctx.lessons.includes(s.lesson));
  let mode = "cards", good = 0, total = 0, kind = "gap", last = null, q = null, built = [], checked = false;

  const example = (id) => {
    const s = sentence(ctx.data, id);
    if (!s) return "";
    return `<div class="rex"><div class="rexmain"><div class="hanzi rexzh">${esc(s.hanzi)}</div><div class="py">${esc(s.pinyin)}</div><div class="rexfr">${esc(s.fr)}</div></div>${canSpeak() ? `<button class="speak" data-say="${esc(s.id)}" aria-label="Écouter">🔊</button>` : ""}</div>`;
  };
  function cards() {
    mode = "cards";
    let html = bar(), cur = null;
    for (const r of rules) {
      if (r.lesson !== cur) { cur = r.lesson; html += `<h3 class="lesson">Leçon ${esc(cur)}</h3>`; }
      const tip = r.kind === "tip";
      html += `<article class="rule${tip ? " tip" : ""}">
        ${tip ? `<div class="rlabel">💡 Astuce</div>` : ""}
        <h4>${esc(r.title)}${r.derived ? `<span class="tag">déduite des textes</span>` : ""}</h4>
        ${r.structure ? `<div class="rstruct hanzi">${esc(r.structure)}</div>` : ""}
        <p>${esc(r.explanation || r.fr)}</p>
        ${(r.examples || []).map(example).join("")}
      </article>`;
    }
    html += `<button class="next" data-train>S'entraîner</button>`;
    root.innerHTML = html;
  }

  const pick = () => {
    const pool = ruleSents.length && Math.random() < 2 / 3 ? ruleSents : lessonSents;
    return pool[Math.floor(Math.random() * pool.length)];
  };
  function nextQ() {
    kind = kind === "gap" ? "reorder" : "gap";
    for (let i = 0; i < 60; i++) {
      const s = pick();
      if (!s) break;
      if (kind === "reorder") {
        const r = reorderQuestion(s, Math.random);
        if (r.answer.length >= 3) { q = { s, ...r, used: [] }; break; }
      } else {
        const g = gapQuestion(s, words, Math.random, ctx.data.words);
        if (g) { q = { s, ...g }; break; }
      }
      if (i % 2) kind = kind === "gap" ? "reorder" : "gap";
    }
    built = []; checked = false;
    drawQ();
  }
  const head = () => bar(`<span class="score" aria-live="polite">${good} bonnes / ${total}</span>`);
  function drawQ() {
    mode = "practice";
    if (!q) { root.innerHTML = head() + `<p class="empty">Pas assez de phrases pour s'entraîner.</p>`; return; }
    const sp = canSpeak() ? `<button class="speak" data-say="${esc(q.s.id)}" aria-label="Écouter">🔊</button>` : "";
    if (kind === "gap") {
      root.innerHTML = head() + `<p class="hint">Complète la phrase</p>
        <div class="prompt sent"><span class="hanzi">${esc(q.before)}<span class="blank">＿＿</span>${esc(q.after)}</span></div>
        <p class="hint">${esc(q.s.fr)}</p>
        <div class="choices">${q.choices.map((c, i) => `<button class="choice hanzi" data-i="${i}">${esc(c)}</button>`).join("")}</div>
        <div class="foot"></div>`;
    } else {
      root.innerHTML = head() + `<p class="hint">Remets les mots dans l'ordre</p>
        <p class="rfr">${esc(q.s.fr)}</p>
        <div class="rline hanzi" aria-label="Ta phrase"></div>
        <div class="rbank hanzi"></div>
        <div class="rtools"><button class="mode" data-clear>Effacer</button><button class="mode primary" data-check>Vérifier</button></div>
        <div class="foot">${sp ? "" : ""}</div>`;
      drawTokens();
    }
  }
  function drawTokens() {
    root.querySelector(".rline").innerHTML = built.length
      ? built.map((i, k) => `<button class="rtok" data-rm="${k}">${esc(q.tokens[i])}</button>`).join("")
      : `<span class="rempty">Touche les mots ci-dessous</span>`;
    root.querySelector(".rbank").innerHTML = q.tokens
      .map((t, i) => built.includes(i) ? "" : `<button class="rtok" data-add="${i}">${esc(t)}</button>`).join("");
  }
  const sentenceInfo = () => `<div class="rsol"><div class="hanzi">${esc(q.s.hanzi)}</div><div class="py">${esc(q.s.pinyin)}</div></div>`;
  function checkReorder() {
    if (checked || built.length !== q.tokens.length) return;
    checked = true;
    const ok = built.every((i, k) => q.tokens[i] === q.answer[k]);
    total++; if (ok) good++;
    root.querySelector(".score").textContent = `${good} bonnes / ${total}`;
    root.querySelector(".rline").classList.add(ok ? "ok" : "bad");
    root.querySelector(".rtools").remove();
    root.querySelector(".foot").innerHTML = `<p class="${ok ? "pyok" : "pybad"}">${ok ? "Correct" : "Pas tout à fait — phrase du manuel :"}</p>${sentenceInfo()}<button class="next">Suivant ›</button>`;
    speak(q.s.hanzi);
  }
  function answerGap(i) {
    if (checked) return;
    checked = true;
    const ok = q.choices[i] === q.answer;
    total++; if (ok) good++;
    const btns = root.querySelectorAll(".choice");
    btns[q.choices.indexOf(q.answer)].classList.add("ok");
    if (!ok) btns[i].classList.add("bad");
    root.querySelector(".choices").classList.add("done");
    root.querySelector(".score").textContent = `${good} bonnes / ${total}`;
    root.querySelector(".blank").textContent = q.answer;
    root.querySelector(".foot").innerHTML = `<p class="${ok ? "pyok" : "pybad"}">${ok ? "Correct" : "Raté"}</p>${sentenceInfo()}<button class="next">Suivant ›</button>`;
    speak(q.s.hanzi);
  }

  root.onclick = (e) => {
    const t = e.target;
    if (t.closest(".back")) return mode === "practice" ? cards() : ctx.navigate("#/");
    if (t.closest("[data-train]")) { kind = "gap"; return nextQ(); }
    const say = t.closest("[data-say]");
    if (say) { const s = sentence(ctx.data, say.dataset.say) || q?.s; return s && speak(s.hanzi); }
    if (mode !== "practice") return;
    const add = t.closest("[data-add]");
    if (add && !checked) { built.push(Number(add.dataset.add)); return drawTokens(); }
    const rm = t.closest("[data-rm]");
    if (rm && !checked) { built.splice(Number(rm.dataset.rm), 1); return drawTokens(); }
    if (t.closest("[data-clear]") && !checked) { built = []; return drawTokens(); }
    if (t.closest("[data-check]")) return checkReorder();
    const c = t.closest(".choice");
    if (c) return answerGap(Number(c.dataset.i));
    if (t.closest(".next")) nextQ();
  };
  cards();
  return () => { root.onclick = null; };
}
