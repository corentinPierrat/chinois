import { wordsFor } from "../data.js";

const MODES = [
  ["#/mots", "Mots", "📖"],
  ["#/reconnaitre", "Reconnaître", "👀"],
  ["#/ecrire", "Écrire", "✍️"],
  ["#/tons", "Pinyin & tons", "🎵"],
  ["#/regles", "Règles", "📐"],
  ["#/cartes", "Cartes", "🃏"],
  ["#/progres", "Progrès", "📈"],
];

export function render(root, ctx) {
  const ids = ctx.data.lessons.map((l) => l.id);
  root.innerHTML = `<h1>Révision chinois</h1><p class="sub">Choisis les leçons à réviser</p>
    <div class="chips" role="group" aria-label="Leçons"></div>
    <p class="count"></p><div class="modes"></div>`;
  const chips = root.querySelector(".chips");
  const count = root.querySelector(".count");

  function paint() {
    chips.innerHTML = "";
    const all = ids.every((i) => ctx.lessons.includes(i));
    const mk = (label, pressed, onClick) => {
      const b = document.createElement("button");
      b.className = "chip"; b.textContent = label; b.setAttribute("aria-pressed", pressed);
      b.onclick = onClick; chips.append(b);
    };
    mk("Tout", all, () => { ctx.setLessons(ids); paint(); });
    for (const id of ids) {
      mk(String(id), ctx.lessons.includes(id), () => {
        const sel = ctx.lessons.includes(id) ? ctx.lessons.filter((x) => x !== id) : [...ctx.lessons, id];
        ctx.setLessons(sel); paint();
      });
    }
    const n = wordsFor(ctx.data, ctx.lessons).length;
    count.textContent = `${n} mot${n > 1 ? "s" : ""} sélectionné${n > 1 ? "s" : ""}`;
    root.querySelectorAll(".mode").forEach((b) => (b.disabled = n === 0 && !["#/progres", "#/cartes"].includes(b.dataset.h)));
  }

  const modes = root.querySelector(".modes");
  for (const [h, label, ico] of MODES) {
    const b = document.createElement("button");
    b.className = "mode"; b.dataset.h = h;
    b.innerHTML = `<span class="ico">${ico}</span>${label}`;
    b.onclick = () => ctx.navigate(h);
    modes.append(b);
  }
  paint();
}
