import { wordsFor } from "../data.js";
import { syllables } from "../pinyin.js";
import { cjkChars, writeQueue } from "../quiz.js";
import { speak, canSpeak } from "../speech.js";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const MODES = [["rec", "Sens"], ["recpy", "Pinyin"], ["write", "Écriture"], ["tone", "Tons"]];

export function render(root, ctx) {
  // Toutes les leçons du jeu de données (pas seulement la sélection).
  const lessons = ctx.data.lessons;

  function stats() {
    const p = ctx.progress || {};
    return lessons.map((l) => {
      const words = wordsFor(ctx.data, [l.id]);
      const chars = writeQueue(words);
      const toneWords = words.filter((w) => {
        const n = cjkChars(w.hanzi).length;
        return n > 0 && syllables(w.pinyin).length === n;
      });
      const ids = { rec: words.map((w) => w.id), recpy: words.map((w) => w.id), write: chars, tone: toneWords.map((w) => w.id) };
      const modes = MODES.map(([m, label]) => {
        let seen = 0, mastered = 0;
        for (const id of ids[m]) {
          const e = p[`${m}:${id}`];
          if (e && e.seen > 0) { seen++; if (e.box >= 4) mastered++; }
        }
        return { label, seen, mastered, total: ids[m].length };
      });
      return { lesson: l, modes };
    });
  }

  function missed() {
    const p = ctx.progress || {};
    const words = new Map(ctx.data.words.map((w) => [String(w.id), w]));
    const sums = new Map();
    for (const [k, e] of Object.entries(p)) {
      const i = k.indexOf(":");
      const mode = k.slice(0, i), id = k.slice(i + 1);
      if (!e || !(e.wrong > 0)) continue;
      if (mode === "write") sums.set("c:" + id, { text: id, sub: "", n: e.wrong });
      else if (words.has(id)) {
        const w = words.get(id);
        const cur = sums.get("w:" + id) || { text: w.hanzi, sub: `${w.pinyin} · ${w.fr ?? ""}`, n: 0 };
        cur.n += e.wrong; sums.set("w:" + id, cur);
      }
    }
    return [...sums.values()].sort((a, b) => b.n - a.n).slice(0, 10);
  }

  function draw() {
    const st = stats(), top = missed();
    root.innerHTML = `<div class="bar"><button class="back">‹ Retour</button><h2>Progression</h2></div>
      <p class="hint">Barre pleine = maîtrisé (boîte 4+), claire = vu. Toutes les leçons.</p>
      ${st.map(({ lesson, modes }) => `<section class="plesson"><h3>Leçon ${lesson.id} <small>${esc(lesson.title)}</small></h3>
        ${modes.map((m) => `<div class="prow"><span class="plabel">${m.label}</span>
          <div class="pbar" role="img" aria-label="${m.mastered} maîtrisés, ${m.seen} vus sur ${m.total}"><i class="pseen" style="width:${m.total ? (m.seen / m.total) * 100 : 0}%"></i><i class="pmast" style="width:${m.total ? (m.mastered / m.total) * 100 : 0}%"></i></div>
          <span class="pnum">${m.mastered}/${m.seen}/${m.total}</span></div>`).join("")}
      </section>`).join("")}
      <p class="hint">Chiffres : maîtrisés / vus / total</p>
      <h3>Les plus ratés</h3>
      ${top.length ? top.map((t, i) => `<div class="miss"><span class="mhz">${esc(t.text)}</span><span class="mmain"><span class="rexfr">${esc(t.sub)}</span></span><b class="mn">${t.n}×</b>${canSpeak() ? `<button class="speak" data-i="${i}" aria-label="Écouter">🔊</button>` : ""}</div>`).join("") : `<p class="empty">Aucune erreur enregistrée.</p>`}
      <div class="foot"><button class="chip reset">Réinitialiser</button></div>`;
    root.onclick = (e) => {
      const t = e.target;
      if (t.closest(".back")) return ctx.navigate("#/");
      const s = t.closest(".speak");
      if (s) return speak(top[Number(s.dataset.i)].text);
      if (t.closest(".reset") && confirm("Effacer toute la progression ?")) {
        for (const k of Object.keys(ctx.progress)) delete ctx.progress[k];
        ctx.saveProgress();
        draw();
      }
    };
  }
  draw();
  return () => { root.onclick = null; };
}
