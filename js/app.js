import { loadData } from "./data.js";
import storage from "./storage.js";

const LESSONS_KEY = "revchinois.lessons";
const PROGRESS_KEY = "revchinois.progress";
const ALL = [1, 2, 3, 4, 5, 6, 7, 8];

// Add a route here: hash -> view module path (exports render(root, ctx)). null = « Bientôt disponible ».
const ROUTES = {
  "#/": "./views/home.js",
  "#/mots": "./views/words.js",
  "#/reconnaitre": "./views/recognize.js",
  "#/ecrire": "./views/write.js",
  "#/tons": null,
  "#/regles": null,
  "#/progres": null,
};

const root = document.getElementById("app");
let cleanup = null;
let ctx = null;

function placeholder() {
  root.innerHTML = `<div class="bar"><button class="back">‹ Retour</button></div><p class="soon">Bientôt disponible</p>`;
  root.querySelector(".back").onclick = () => ctx.navigate("#/");
}

function errorScreen(err) {
  console.error(err);
  root.innerHTML = `<div class="bar"><button class="back">‹ Retour</button></div><p class="soon">Oups, cet écran a planté</p>`;
  root.querySelector(".back").onclick = () => ctx.navigate("#/");
}

async function route() {
  if (typeof cleanup === "function") { try { cleanup(); } catch {} }
  cleanup = null;
  const hash = hash0();
  const token = (route.t = (route.t || 0) + 1);
  if (!ROUTES[hash]) { window.scrollTo(0, 0); return placeholder(); }
  let mod;
  try { mod = await import(ROUTES[hash]); } catch (e) { if (token === route.t) errorScreen(e); return; }
  if (token !== route.t) return;
  window.scrollTo(0, 0);
  try {
    if (typeof mod.render !== "function") throw new Error("render() manquant");
    cleanup = mod.render(root, ctx) || null;
  } catch (e) { errorScreen(e); }
}

function hash0() { return location.hash in ROUTES ? location.hash : "#/"; }

async function start() {
  root.innerHTML = `<p class="soon">Chargement…</p>`;
  let data;
  try { data = await loadData(); }
  catch (e) {
    root.innerHTML = `<p class="soon">Impossible de charger les données.<br><small></small><br><br><button class="chip">Réessayer</button></p>`;
    root.querySelector("small").textContent = e.message;
    root.querySelector("button").onclick = () => location.reload();
    return;
  }
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
