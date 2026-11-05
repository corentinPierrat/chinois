import { wordsFor } from "../data.js";
import { writeQueue } from "../quiz.js";
import { itemKey, record, pickNext, remaining } from "../srs.js";
import { speak } from "../speech.js";
import { charData, colors, GRID_SVG } from "../hanzi.js";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const MAX_MISTAKES = 2; // ≤ 2 erreurs = réussi

export function render(root, ctx) {
  const bar = (extra = "") => `<div class="bar"><button class="back">‹ Retour</button><h2>Écrire</h2>${extra}</div>`;
  root.onclick = (e) => { if (e.target.closest(".back")) ctx.navigate("#/"); };

  const pool = wordsFor(ctx.data, ctx.lessons, { includeProper: false });
  const allChars = writeQueue(pool);
  if (typeof window.HanziWriter === "undefined") {
    root.innerHTML = bar() + `<p class="empty">Le module d'écriture n'a pas pu se charger.</p>`;
    return () => { root.onclick = null; };
  }
  if (!allChars.length) {
    root.innerHTML = bar() + `<p class="empty">Aucune leçon sélectionnée.</p>`;
    return () => { root.onclick = null; };
  }

  let alive = true, writer = null, timer = null;
  let chars = [], firstPass = [], last = null;
  const done = new Set(); // keys written correctly this session
  let cur = null; // { char, word, mistakes, helped, done, practice, total }
  let good = 0, total = 0, outline = false;

  const clear = () => { if (timer) { clearTimeout(timer); timer = null; } };
  root.innerHTML = bar() + `<p class="soon">Chargement…</p>`;

  // Load stroke data for the whole queue to sort the first pass by stroke count.
  Promise.all(allChars.map((c) => charData(c).then((d) => [c, d.strokes.length], () => null))).then((res) => {
    if (!alive) return;
    const counts = new Map(res.filter(Boolean));
    chars = allChars.filter((c) => counts.has(c));
    if (!chars.length) {
      root.innerHTML = bar() + `<p class="empty">Impossible de charger les tracés.</p>`;
      return;
    }
    // First pass: characters never practised, fewest strokes first (stable on lesson order).
    firstPass = chars
      .map((c, i) => [c, counts.get(c), i])
      .filter(([c]) => !ctx.progress[itemKey("write", c)])
      .sort((a, b) => a[1] - b[1] || a[2] - b[2])
      .map(([c]) => c);
    setup();
    next();
  });

  function setup() {
    root.innerHTML = bar(`<span class="score" aria-live="polite">0 réussis / 0</span>`) +
      `<div class="wprompt">
        <div class="wfr"></div>
        <div class="wword zh"></div>
        <div class="wpy"></div>
      </div>
      <div class="wgrid">${GRID_SVG}<div class="wtarget"></div></div>
      <div class="wstatus" aria-live="polite"></div>
      <div class="wtools">
        <button class="chip" data-act="hint" aria-pressed="false">Indice</button>
        <button class="chip" data-act="order">Voir l'ordre</button>
        <button class="chip" data-act="retry">Recommencer</button>
      </div>
      <button class="next" data-act="next">Suivant ›</button>`;
    const grid = root.querySelector(".wgrid");
    const size = Math.round(Math.min(grid.parentElement.clientWidth || 300, window.innerWidth * 0.8, window.innerHeight * 0.38, 300));
    grid.style.width = grid.style.height = size + "px";
    // Belt and braces with touch-action:none: never let a trace scroll or zoom the page.
    const stop = (e) => { if (e.cancelable) e.preventDefault(); };
    grid.addEventListener("touchstart", stop, { passive: false });
    grid.addEventListener("touchmove", stop, { passive: false });
    writer = window.HanziWriter.create(root.querySelector(".wtarget"), allChars[0], {
      width: size,
      height: size,
      padding: 8,
      showCharacter: false,
      showOutline: false,
      showHintAfterMisses: 1,
      strokeAnimationSpeed: 1,
      delayBetweenStrokes: 250,
      drawingWidth: Math.max(14, Math.round(size / 18)),
      ...colors(),
      charDataLoader: (c) => charData(c),
    });
  }

  function next() {
    clear();
    let c = firstPass.shift();
    if (!c) c = keyChar(pickNext(remaining(chars.map((ch) => itemKey("write", ch)), done), ctx.progress, Math.random, last));
    last = itemKey("write", c);
    const words = pool.filter((w) => w.hanzi.includes(c));
    const word = words[Math.floor(Math.random() * words.length)];
    cur = { char: c, word, mistakes: 0, helped: false, done: false, practice: false, total: 0 };
    outline = false;
    drawPrompt();
    writer.setCharacter(c).then(() => {
      if (!alive || cur.char !== c) return;
      writer.hideOutline({ duration: 0 });
      startQuiz();
    });
  }
  const keyChar = (key) => key.slice(key.indexOf(":") + 1);

  function drawPrompt() {
    const w = cur.word;
    root.querySelector(".wfr").textContent = w.fr;
    root.querySelector(".wpy").textContent = w.pinyin;
    root.querySelector(".wword").innerHTML = [...w.hanzi]
      .map((ch) => (ch === cur.char ? `<span class="blank" aria-label="caractère à écrire"></span>` : `<span>${esc(ch)}</span>`))
      .join("");
    const hint = root.querySelector('[data-act="hint"]');
    hint.setAttribute("aria-pressed", "false");
    root.querySelector(".wgrid").classList.remove("ok", "bad");
    status("Trace le caractère manquant");
    root.querySelector(".next").textContent = "Passer ›";
  }

  function status(t, cls = "") {
    const el = root.querySelector(".wstatus");
    el.textContent = t;
    el.className = "wstatus " + cls;
  }

  function startQuiz() {
    const c = cur.char;
    cur.mistakes = 0;
    writer.quiz({
      onCorrectStroke(d) {
        if (cur.char !== c) return;
        cur.total = d.strokeNum + 1 + d.strokesRemaining;
        status(`Trait ${d.strokeNum + 1} / ${cur.total}` + (d.totalMistakes ? ` · ${d.totalMistakes} erreur${d.totalMistakes > 1 ? "s" : ""}` : ""));
      },
      onMistake(d) {
        if (cur.char !== c) return;
        cur.mistakes = d.totalMistakes;
        status(`Pas ce trait-là · ${d.totalMistakes} erreur${d.totalMistakes > 1 ? "s" : ""}`, "warn");
      },
      onComplete(summary) {
        if (cur.char !== c || cur.done) return;
        finish(summary.totalMistakes);
      },
    });
  }

  function finish(mistakes) {
    cur.done = true;
    if (cur.practice) {
      root.querySelector(".wgrid").classList.add("ok");
      status(`Entraînement terminé (${mistakes} erreur${mistakes > 1 ? "s" : ""})`, "good");
      root.querySelector(".wword").innerHTML = esc(cur.word.hanzi);
      root.querySelector(".next").textContent = "Suivant ›";
      return;
    }
    const ok = mistakes <= MAX_MISTAKES && !cur.helped;
    total++; if (ok) good++;
    ctx.progress = record(ctx.progress, itemKey("write", cur.char), ok, Date.now());
    if (ok) done.add(itemKey("write", cur.char));
    ctx.saveProgress();
    root.querySelector(".score").textContent = `${good} réussis / ${total}`;
    root.querySelector(".wgrid").classList.add(ok ? "ok" : "bad");
    const err = `${mistakes} erreur${mistakes > 1 ? "s" : ""}`;
    if (ok) status(mistakes ? `Bien ! (${err})` : "Parfait !", "good");
    else status(cur.helped ? `Fait avec aide (${err}) — à revoir` : `${err} — à revoir`, "warn");
    root.querySelector(".wword").innerHTML = esc(cur.word.hanzi);
    root.querySelector(".next").textContent = "Suivant ›";
    speak(cur.word.hanzi);
    if (ok) timer = setTimeout(next, 1600);
  }

  function toggleHint(btn) {
    outline = !outline;
    btn.setAttribute("aria-pressed", String(outline));
    if (outline) { writer.showOutline(); if (!cur.done) cur.helped = true; }
    else writer.hideOutline();
  }

  function showOrder() {
    clear();
    if (!cur.done) cur.helped = true;
    const c = cur.char;
    status("Regarde l'ordre des traits…");
    writer.animateCharacter({
      onComplete() {
        if (!alive || cur.char !== c) return;
        if (cur.done) { writer.showCharacter(); status("Voilà l'ordre des traits"); return; }
        // Clear the animated character and let him trace it again.
        writer.hideCharacter({ duration: 300 });
        status("À toi ! Trace le caractère");
        startQuiz();
      },
    });
  }

  function retry() {
    clear();
    if (cur.done) {
      // Practice again without recording a second result.
      cur.done = false; cur.practice = true;
      root.querySelector(".wgrid").classList.remove("ok", "bad");
      drawPrompt();
      if (outline) writer.showOutline();
      root.querySelector('[data-act="hint"]').setAttribute("aria-pressed", String(outline));
    }
    writer.hideCharacter({ duration: 0 });
    status("Trace le caractère manquant");
    startQuiz();
  }

  root.onclick = (e) => {
    const t = e.target;
    if (t.closest(".back")) { clear(); return ctx.navigate("#/"); }
    const a = t.closest("[data-act]");
    if (!a || !cur) return;
    const act = a.dataset.act;
    if (act === "hint") toggleHint(a);
    else if (act === "order") showOrder();
    else if (act === "retry") retry();
    else if (act === "next") next();
  };

  return () => {
    alive = false;
    clear();
    root.onclick = null;
    if (writer) { try { writer.cancelQuiz(); } catch {} }
    writer = null;
  };
}
