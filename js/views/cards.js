import { wordsFor } from "../data.js";
import { speak, canSpeak } from "../speech.js";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// Poster deck is loaded once and kept across visits
let affiche = null;
const loadAffiche = () => (affiche ||= fetch("data/affiche.json").then((r) => {
  if (!r.ok) throw new Error(`Chargement impossible: data/affiche.json (${r.status})`);
  return r.json();
}).catch((e) => { affiche = null; throw e; }));

export function shuffle(arr, rnd = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

export function render(root, ctx) {
  let alive = true;
  let deck = ctx.lessons.length ? "lecons" : "affiche";
  let cards = [], i = 0, flipped = false;
  const bar = `<div class="bar"><button class="back">‹ Retour</button><h2>Cartes</h2><span class="score" aria-live="polite"></span></div>
    <div class="seg" role="group"><button data-deck="lecons">Leçons</button><button data-deck="affiche">Mon affiche</button></div>
    <div class="cbody"></div>`;
  root.innerHTML = bar;
  const body = root.querySelector(".cbody");
  const score = root.querySelector(".score");

  async function load() {
    root.querySelectorAll("[data-deck]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.deck === deck));
    score.textContent = "";
    if (deck === "lecons") {
      cards = wordsFor(ctx.data, ctx.lessons).map((w) => ({ hanzi: w.hanzi, pinyin: w.pinyin, fr: w.fr || w.en, word: "" }));
      if (!cards.length) { body.innerHTML = `<p class="empty">Aucune leçon sélectionnée.</p>`; return; }
    } else {
      body.innerHTML = `<p class="soon">Chargement…</p>`;
      try { cards = (await loadAffiche()).cards; }
      catch (e) { if (alive && deck === "affiche") body.innerHTML = `<p class="empty">${esc(e.message)}</p>`; return; }
      if (!alive || deck !== "affiche") return;
    }
    cards = shuffle(cards); i = 0; flipped = false;
    draw();
  }

  function draw() {
    const c = cards[i];
    score.textContent = `${i + 1} / ${cards.length}`;
    body.innerHTML = `<button class="fcard${flipped ? " flipped" : ""}" aria-label="Retourner la carte">
        <span class="fin">
          <span class="fface ffront"><span class="hanzi${[...c.hanzi].length > 3 ? " long" : ""}">${esc(c.hanzi)}</span></span>
          <span class="fface fback"><span class="fpy">${esc(c.pinyin)}</span><span class="ffr">${esc(c.fr)}</span>${c.word ? `<span class="fword">${esc(c.word)}</span>` : ""}</span>
        </span>
      </button>
      <p class="hint">${flipped ? "Touche la carte pour revoir le caractère" : "Touche la carte pour voir le pinyin"}</p>
      <div class="rtools">
        <button class="mode" data-nav="-1" ${i === 0 ? "disabled" : ""}>‹ Précédente</button>
        ${canSpeak() ? `<button class="speak" data-speak aria-label="Écouter">🔊</button>` : ""}
        <button class="mode primary" data-nav="1">${i === cards.length - 1 ? "Remélanger" : "Suivante ›"}</button>
      </div>`;
  }

  root.onclick = (e) => {
    const t = e.target;
    if (t.closest(".back")) return ctx.navigate("#/");
    const d = t.closest("[data-deck]");
    if (d) { if (d.dataset.deck !== deck) { deck = d.dataset.deck; load(); } return; }
    if (!cards.length) return;
    if (t.closest(".fcard")) {
      flipped = !flipped;
      root.querySelector(".fcard").classList.toggle("flipped", flipped);
      root.querySelector(".hint").textContent = flipped ? "Touche la carte pour revoir le caractère" : "Touche la carte pour voir le pinyin";
      return;
    }
    if (t.closest("[data-speak]")) return speak(cards[i].hanzi);
    const n = t.closest("[data-nav]");
    if (n) {
      const step = Number(n.dataset.nav);
      if (step > 0 && i === cards.length - 1) { cards = shuffle(cards); i = 0; }
      else i = Math.max(0, Math.min(cards.length - 1, i + step));
      flipped = false;
      draw();
    }
  };
  load();
  return () => { alive = false; root.onclick = null; };
}
