import { loadData } from "./data.js";
import storage from "./storage.js";

const LESSONS_KEY = "revchinois.lessons";
const PROGRESS_KEY = "revchinois.progress";
const ALL = [1, 2, 3, 4, 5, 6, 7, 8];

// Add a route here: hash -> view module (exports render(root, ctx)).
const ROUTES = {
  "#/": "./views/home.js",
  "#/mots": "./views/words.js",
  "#/reconnaitre": "./views/reconnaitre.js",
  "#/ecrire": "./views/ecrire.js",
  "#/tons": "./views/tons.js",
  "#/regles": "./views/regles.js",
  "#/progres": "./views/progres.js",
};

const root = document.getElementById("app");
let cleanup = null;
let ctx = null;

function placeholder() {
  root.innerHTML = `<div class="bar"><button class="back">‹ Retour</button></div><p class="soon">Bientôt disponible</p>`;
  root.querySelector(".back").onclick = () => ctx.navigate("#/");
}

async function route() {
  if (typeof cleanup === "function") { try { cleanup(); } catch {} }
  cleanup = null;
  const hash = ROUTES[location.hash] ? location.hash : "#/";
  const token = (route.t = (route.t || 0) + 1);
  let mod = null;
  try { mod = await import(ROUTES[hash]); } catch { mod = null; }
  if (token !== route.t) return;
  root.scrollTo?.(0, 0); window.scrollTo(0, 0);
  if (!mod || typeof mod.render !== "function") return placeholder();
  cleanup = mod.render(root, ctx) || null;
}

async function start() {
  root.innerHTML = `<p class="soon">Chargement…</p>`;
  let data;
  try { data = await loadData(); }
  catch (e) { root.innerHTML = `<p class="soon">Impossible de charger les données.<br><small>${e.message}</small></p>`; return; }
  const saved = storage.load(LESSONS_KEY, ALL);
  const valid = Array.isArray(saved) ? saved.filter((n) => data.lessons.some((l) => l.id === n)) : ALL;
  const progress = storage.load(PROGRESS_KEY, {}) || {};
  ctx = {
    data,
    lessons: valid,
    storage,
    progress,
    navigate(h) { if (location.hash === h) route(); else location.hash = h; },
    saveProgress() { storage.save(PROGRESS_KEY, ctx.progress); },
    setLessons(ids) { ctx.lessons = ids.slice().sort((a, b) => a - b); storage.save(LESSONS_KEY, ctx.lessons); },
  };
  window.addEventListener("hashchange", route);
  route();
}
start();
