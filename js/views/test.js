import { wordsFor } from "../data.js";
import { makeChoiceQuestion, reorderQuestion } from "../quiz.js";
import { itemKey, record } from "../srs.js";
import { speak } from "../speech.js";
import { charData, colors, GRID_SVG } from "../hanzi.js";
import { shuffle } from "./cards.js";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const MAX_MISTAKES = 2; // même seuil que le mode Écrire
const EXAM = { write: 10, rec: 10, recpy: 5, reorder: 3 };

let testData = null;
const loadTest = () => (testData ||= fetch("data/test.json").then((r) => {
  if (!r.ok) throw new Error(`Chargement impossible: data/test.json (${r.status})`);
  return r.json();
}).catch((e) => { testData = null; throw e; }));

// Builds the question list for a run. Pure so it can be tested.
export function buildRun(kind, test, pool, allWords, rng = Math.random, sents = []) {
  const w = (it) => ({ type: "write", item: it });
  const ro = (s) => ({ type: "reorder", s, ...reorderQuestion(s, rng) });
  if (kind === "cahier") return shuffle(sents, rng).map(ro);
  if (kind === "numbers") return shuffle(test.numbers, rng).map(w);
  if (kind === "simples") return shuffle(test.simples, rng).map(w);
  if (kind === "writeall") return shuffle([...test.numbers, ...test.simples], rng).map(w);
  // exam: half numbers / half simples for writing, then multiple choice on the selected lessons
  const nNum = Math.ceil(EXAM.write / 2);
  const writes = shuffle([
    ...shuffle(test.numbers, rng).slice(0, nNum),
    ...shuffle(test.simples, rng).slice(0, EXAM.write - nNum),
  ], rng).map(w);
  const words = shuffle(pool, rng);
  const qcm = (field, list) => list.map((word) => ({ type: "qcm", field, q: makeChoiceQuestion(word, pool, field === "rec" ? "fr" : "pinyin", rng, allWords) }));
  return [
    ...writes,
    ...qcm("rec", words.slice(0, EXAM.rec)),
    ...qcm("recpy", words.slice(EXAM.rec, EXAM.rec + EXAM.recpy)),
    ...shuffle(sents, rng).slice(0, EXAM.reorder).map(ro),
  ];
}

export const note20 = (good, total) => (total ? Math.round((good / total) * 200) / 10 : 0);

export function render(root, ctx) {
  let alive = true, writer = null, timer = null;
  let run = [], i = 0, results = [], cur = null, lastKind = "exam";
  const clear = () => { if (timer) { clearTimeout(timer); timer = null; } };
  const bar = (extra = "") => `<div class="bar"><button class="back">‹ Retour</button><h2>Test</h2>${extra}</div>`;
  const pool = wordsFor(ctx.data, ctx.lessons, { includeProper: false });
  const sents = ctx.data.sentences.filter((s) => s.speaker === "cahier" && ctx.lessons.includes(s.lesson));

  function stopWriter() {
    if (writer) { try { writer.cancelQuiz(); } catch {} }
    writer = null;
  }

  function home() {
    clear(); stopWriter();
    root.innerHTML = bar() + `<p class="sub">Comme le jour de l'examen : pas d'indice, la note s'affiche à la fin.</p>
      <div class="modes tmodes">
        <button class="mode primary" data-run="exam"><span class="ico">📝</span>Examen blanc<small>${EXAM.write} écritures + ${EXAM.rec + EXAM.recpy} QCM${sents.length ? ` + ${Math.min(EXAM.reorder, sents.length)} phrases` : ""}</small></button>
        <button class="mode" data-run="writeall"><span class="ico">✍️</span>Toute l'écriture<small>0 à 10 + simples</small></button>
        <button class="mode" data-run="numbers"><span class="ico">🔢</span>Nombres<small>零 一 二 … 十</small></button>
        <button class="mode" data-run="simples"><span class="ico">⬆️</span>Simples<small>上 下 不 我 你 他…</small></button>
        <button class="mode" data-run="cahier" ${sents.length ? "" : "disabled"}><span class="ico">📓</span>Phrases du cahier<small>${sents.length ? `${sents.length} phrases à remettre dans l'ordre` : "Coche la leçon 8"}</small></button>
      </div>
      <p class="hint tnote"></p>`;
    loadTest().then((t) => { if (alive) { const n = root.querySelector(".tnote"); if (n) n.textContent = t.note; } }, () => {});
    if (!pool.length) {
      const b = root.querySelector('[data-run="exam"]');
      b.disabled = true;
      b.querySelector("small").textContent = "Choisis des leçons sur l'accueil";
    }
  }

  async function start(kind, only = null) {
    clear(); stopWriter();
    lastKind = kind;
    root.innerHTML = bar() + `<p class="soon">Chargement…</p>`;
    let t;
    try { t = await loadTest(); }
    catch (e) { if (alive) root.innerHTML = bar() + `<p class="empty">${esc(e.message)}</p>`; return; }
    if (!alive) return;
    run = only ? shuffle(only) : buildRun(kind, t, pool, ctx.data.words, Math.random, sents);
    i = 0; results = [];
    if (typeof window.HanziWriter === "undefined" && run.some((q) => q.type === "write")) {
      root.innerHTML = bar() + `<p class="empty">Le module d'écriture n'a pas pu se charger.</p>`;
      return;
    }
    show();
  }

  const score = () => `<span class="score" aria-live="polite">${i + 1} / ${run.length}</span>`;

  function show() {
    clear(); stopWriter();
    if (i >= run.length) return end();
    cur = { ...run[i], done: false };
    if (cur.type === "write") showWrite(); else if (cur.type === "reorder") showReorder(); else showQcm();
  }

  function showWrite() {
    const it = cur.item;
    root.innerHTML = bar(score()) +
      `<div class="wprompt">
        ${it.digit ? `<div class="tdigit">${esc(it.digit)}</div>` : ""}
        <div class="wfr">${esc(it.fr)}</div>
        <div class="wpy">${esc(it.pinyin)}</div>
      </div>
      <div class="wgrid">${GRID_SVG}<div class="wtarget"></div></div>
      <div class="wstatus" aria-live="polite">Écris le caractère</div>
      <div class="wtools"><button class="chip" data-act="giveup">Je ne sais pas</button></div>
      <button class="next" data-act="next">Passer ›</button>`;
    const grid = root.querySelector(".wgrid");
    const size = Math.round(Math.min(grid.parentElement.clientWidth || 300, window.innerWidth * 0.8, window.innerHeight * 0.38, 300));
    grid.style.width = grid.style.height = size + "px";
    const stop = (e) => { if (e.cancelable) e.preventDefault(); };
    grid.addEventListener("touchstart", stop, { passive: false });
    grid.addEventListener("touchmove", stop, { passive: false });
    const c = it.hanzi, mine = cur;
    writer = window.HanziWriter.create(root.querySelector(".wtarget"), c, {
      width: size, height: size, padding: 8,
      showCharacter: false, showOutline: false, showHintAfterMisses: false,
      strokeAnimationSpeed: 1.2, delayBetweenStrokes: 200,
      drawingWidth: Math.max(14, Math.round(size / 18)),
      ...colors(),
      charDataLoader: (ch) => charData(ch),
    });
    writer.quiz({
      onMistake(d) {
        if (cur !== mine || mine.done) return;
        status(`${d.totalMistakes} erreur${d.totalMistakes > 1 ? "s" : ""}`, "warn");
      },
      onComplete(s) { if (cur === mine && !mine.done) finishWrite(s.totalMistakes <= MAX_MISTAKES, s.totalMistakes); },
    });
  }

  function status(t, cls = "") {
    const el = root.querySelector(".wstatus");
    if (el) { el.textContent = t; el.className = "wstatus " + cls; }
  }

  function finishWrite(ok, mistakes, gaveUp = false) {
    cur.done = true;
    results.push({ q: run[i], ok });
    ctx.progress = record(ctx.progress, itemKey("write", cur.item.hanzi), ok, Date.now());
    ctx.saveProgress();
    root.querySelector(".wgrid").classList.add(ok ? "ok" : "bad");
    root.querySelector('[data-act="giveup"]')?.remove();
    root.querySelector(".next").textContent = "Suivant ›";
    speak(cur.item.hanzi);
    if (ok) {
      status(mistakes ? `Bien ! (${mistakes} erreur${mistakes > 1 ? "s" : ""})` : "Parfait !", "good");
      timer = setTimeout(() => { i++; show(); }, 1300);
    } else {
      status(gaveUp ? "Voici le caractère — à revoir" : `${mistakes} erreurs — à revoir`, "warn");
      const mine = cur;
      try { writer.cancelQuiz(); } catch {}
      writer.hideCharacter({ duration: 0 });
      writer.animateCharacter({ onComplete() { if (alive && cur === mine) writer.showCharacter(); } });
    }
  }

  function showQcm() {
    const { q, field } = cur;
    const w = q.word;
    root.innerHTML = bar(score()) +
      `<p class="rfr">${field === "rec" ? "Que veut dire ce mot ?" : "Quel est le pinyin ?"}</p>
      <div class="prompt${[...w.hanzi].length > 3 ? " long" : ""}"><span class="hanzi">${esc(w.hanzi)}</span></div>
      <div class="choices">${q.choices.map((c, k) => `<button class="choice" data-i="${k}">${esc(c)}</button>`).join("")}</div>
      <div class="foot"></div>`;
  }

  function answer(k) {
    if (cur.done) return;
    cur.done = true;
    const { q, field } = cur;
    const ok = k === q.answerIndex;
    results.push({ q: run[i], ok });
    ctx.progress = record(ctx.progress, itemKey(field, q.word.id), ok, Date.now());
    ctx.saveProgress();
    const btns = root.querySelectorAll(".choice");
    btns[q.answerIndex].classList.add("ok");
    if (!ok) btns[k].classList.add("bad");
    root.querySelector(".choices").classList.add("done");
    speak(q.word.hanzi);
    root.querySelector(".foot").innerHTML = `<button class="next" data-act="next">Suivant ›</button>`;
    if (ok) timer = setTimeout(() => { i++; show(); }, 1000);
  }

  function showReorder() {
    cur.built = [];
    root.innerHTML = bar(score()) +
      `<p class="hint">Remets les mots dans l'ordre</p>
      <p class="rfr">${esc(cur.s.fr)}</p>
      <div class="rline hanzi" aria-label="Ta phrase"></div>
      <div class="rbank hanzi"></div>
      <div class="rtools"><button class="mode" data-act="clear">Effacer</button><button class="mode primary" data-act="check">Vérifier</button></div>
      <div class="foot"><button class="next" data-act="next">Passer ›</button></div>`;
    drawTokens();
  }
  function drawTokens() {
    const b = cur.built, tk = cur.tokens;
    root.querySelector(".rline").innerHTML = b.length
      ? b.map((k, j) => `<button class="rtok" data-rm="${j}">${esc(tk[k])}</button>`).join("")
      : `<span class="rempty">Touche les mots ci-dessous</span>`;
    root.querySelector(".rbank").innerHTML = tk.map((x, k) => (b.includes(k) ? "" : `<button class="rtok" data-add="${k}">${esc(x)}</button>`)).join("");
  }
  function checkReorder() {
    if (cur.done || cur.built.length !== cur.tokens.length) return;
    cur.done = true;
    const ok = cur.built.every((k, j) => cur.tokens[k] === cur.answer[j]);
    results.push({ q: run[i], ok });
    root.querySelector(".rline").classList.add(ok ? "ok" : "bad");
    root.querySelector(".rtools").remove();
    root.querySelector(".foot").innerHTML = `<p class="${ok ? "pyok" : "pybad"}">${ok ? "Correct" : "Pas tout à fait :"}</p>
      <div class="rsol"><div class="hanzi">${esc(cur.s.hanzi)}</div><div class="py">${esc(cur.s.pinyin)}</div></div>
      <button class="next" data-act="next">Suivant ›</button>`;
    speak(cur.s.hanzi);
  }

  function skip() {
    if (!cur.done) results.push({ q: run[i], ok: false });
    i++; show();
  }

  function end() {
    const good = results.filter((r) => r.ok).length;
    const n = note20(good, results.length);
    const bad = results.filter((r) => !r.ok).map((r) => r.q);
    const label = (q) => q.type === "reorder"
      ? { hz: q.s.hanzi, py: q.s.pinyin, fr: q.s.fr, kind: "phrase" }
      : q.type === "write"
      ? { hz: q.item.hanzi, py: q.item.pinyin, fr: (q.item.digit ? q.item.digit + " · " : "") + q.item.fr, kind: "écriture" }
      : { hz: q.q.word.hanzi, py: q.q.word.pinyin, fr: q.q.word.fr || q.q.word.en, kind: q.field === "rec" ? "sens" : "pinyin" };
    root.innerHTML = bar() +
      `<div class="tresult"><div class="tnote20${n >= 10 ? " pass" : ""}">${String(n).replace(".", ",")}<small> / 20</small></div>
        <p class="sub">${good} bonne${good > 1 ? "s" : ""} réponse${good > 1 ? "s" : ""} sur ${results.length}</p></div>
      ${bad.length ? `<h3>À revoir</h3>${bad.map((q) => { const l = label(q); return `<div class="miss"><span class="mhz hanzi">${esc(l.hz)}</span><div class="mmain"><div class="py">${esc(l.py)}</div><div>${esc(l.fr)}</div></div><span class="tag">${l.kind}</span></div>`; }).join("")}` : `<p class="rfr">Aucune erreur, bravo ! 🎉</p>`}
      <div class="rtools tend">
        ${bad.length ? `<button class="mode primary" data-act="redo">Refaire les erreurs</button>` : ""}
        <button class="mode" data-act="again">Nouveau test</button>
      </div>`;
    cur = null;
    root._bad = bad;
  }

  root.onclick = (e) => {
    const t = e.target;
    if (t.closest(".back")) {
      if (run.length && i < run.length && cur) { home(); run = []; return; }
      clear(); return ctx.navigate("#/");
    }
    const r = t.closest("[data-run]");
    if (r) return start(r.dataset.run);
    const a = t.closest("[data-act]");
    if (a) {
      const act = a.dataset.act;
      if (act === "next") { clear(); if (cur && cur.done) { i++; show(); } else if (cur) skip(); return; }
      if (act === "giveup" && cur && !cur.done && cur.type === "write") return finishWrite(false, 0, true);
      if (act === "redo") return start(lastKind, root._bad.map((q) => (q.type === "reorder" ? { ...q, ...reorderQuestion(q.s) } : q)));
      if (act === "clear" && cur && !cur.done) { cur.built = []; return drawTokens(); }
      if (act === "check" && cur?.type === "reorder") return checkReorder();
      if (act === "again") { run = []; return home(); }
      return;
    }
    if (cur?.type === "reorder" && !cur.done) {
      const ad = t.closest("[data-add]"), rm = t.closest("[data-rm]");
      if (ad) { cur.built.push(Number(ad.dataset.add)); return drawTokens(); }
      if (rm) { cur.built.splice(Number(rm.dataset.rm), 1); return drawTokens(); }
    }
    const c = t.closest(".choice");
    if (c && cur && cur.type === "qcm") answer(Number(c.dataset.i));
  };

  home();
  return () => { alive = false; clear(); stopWriter(); root.onclick = null; delete root._bad; };
}
