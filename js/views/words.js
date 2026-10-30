import { wordsFor } from "../data.js";
import { speak, canSpeak } from "../speech.js";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export function render(root, ctx) {
  const words = wordsFor(ctx.data, ctx.lessons);
  let html = `<div class="bar"><button class="back">‹ Retour</button><h2>Mots (${words.length})</h2></div>`;
  if (!words.length) html += `<p class="empty">Aucune leçon sélectionnée.</p>`;
  for (const l of ctx.data.lessons) {
    const ws = words.filter((w) => w.lesson === l.id);
    if (!ws.length) continue;
    html += `<div class="lesson"><h2>Leçon ${l.id}</h2><small>${esc(l.fr || l.title)}</small></div>`;
    for (const w of ws) {
      html += `<div class="word"><div class="main"><div class="hanzi">${esc(w.hanzi)}${w.proper ? '<span class="tag">nom propre</span>' : ""}</div>
        <div class="py">${esc(w.pinyin)}</div><div>${esc(w.fr)}</div>${w.en ? `<div class="en">${esc(w.en)}</div>` : ""}</div>
        ${canSpeak() ? `<button class="speak" data-t="${esc(w.hanzi)}" aria-label="Écouter">🔊</button>` : ""}</div>`;
    }
  }
  root.innerHTML = html;
  root.querySelector(".back").onclick = () => ctx.navigate("#/");
  root.onclick = (e) => { const b = e.target.closest(".speak"); if (b) speak(b.dataset.t); };
  return () => { root.onclick = null; };
}
