// Landing page for the live preview � gallery layout showing all 4 SVG types
// (pet, isocat, graph, langs) simultaneously. Plain HTML/JS, no framework.
// The state dropdown is built from VALID_STATES so it never drifts.

import { VALID_STATES } from "../src/state.ts";

const STATE_OPTIONS = [
    `<option value="" selected>auto (real data)</option>`,
    ...VALID_STATES.map((s) => `<option value="${s}">${s}</option>`),
].join("");

const SVGS = [
    { id: "pet",    label: "banner scene" },
    { id: "isocat", label: "iso city" },
    { id: "graph",  label: "contribution graph" },
    { id: "langs",  label: "language chart" },
] as const;

const CARDS = SVGS.map(({ id, label }) =>
    `<div class="card">
        <div class="label">${label}</div>
        <div class="img-wrap"><img id="${id}" alt="${label}"></div>
        <div class="url-line" id="${id}-url"></div>
    </div>`
).join("");

export const LANDING_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>YourTomo &middot; live preview</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; background: #0d1117; color: #e6edf3;
         font: 15px/1.5 -apple-system, "Segoe UI", Helvetica, Arial, sans-serif;
         display: flex; flex-direction: column; align-items: center; padding: 36px 16px; }
  main { width: 100%; max-width: 980px; }
  h1 { font-size: 28px; margin: 0 0 2px; }
  p.sub { color: #8b949e; margin: 0 0 20px; }
  form { display: flex; flex-wrap: wrap; gap: 10px; align-items: center;
         background: #161b22; border: 1px solid #30363d; border-radius: 10px;
         padding: 12px 14px; }
  input[type=text], select { background: #0d1117; color: #e6edf3;
         border: 1px solid #30363d; border-radius: 6px; padding: 9px 12px;
         font: inherit; }
  input[type=text] { flex: 1 1 180px; }
  .theme-toggle { display: inline-flex; border: 1px solid #30363d;
         border-radius: 6px; overflow: hidden; }
  .theme-toggle label { padding: 9px 12px; cursor: pointer; color: #8b949e;
         user-select: none; }
  .theme-toggle input { display: none; }
  .theme-toggle input:checked + span { color: #e6edf3; font-weight: 600; }
  button { background: #238636; border: 0; color: #fff; border-radius: 6px;
           padding: 10px 18px; font: inherit; font-weight: 600; cursor: pointer; }
  button:hover { background: #2ea043; }
  #gallery { margin-top: 20px; grid-template-columns: 1fr 1fr;
           gap: 16px; }
  #gallery:not([hidden]) { display: grid; }
  @media (max-width: 640px) { #gallery { grid-template-columns: 1fr; } }
  .card { background: #0d1117; border: 1px solid #30363d; border-radius: 10px;
          overflow: hidden; }
  .label { padding: 8px 12px; font-size: 12px; font-weight: 600; color: #8b949e;
           text-transform: uppercase; letter-spacing: .6px;
           border-bottom: 1px solid #30363d; background: #161b22; }
  .img-wrap { min-height: 40px; position: relative; }
  .img-wrap img { width: 100%; display: block; }
  .img-wrap.loading { background: linear-gradient(90deg, #161b22 25%, #21262d 50%, #161b22 75%); background-size: 200% 100%; animation: shimmer 1.2s ease-in-out infinite; border-radius: 0 0 10px 10px; }
  .img-wrap.loading img { opacity: 0; }
  @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
  .url-line { padding: 6px 12px; font-size: 12px; color: #8b949e; word-break: break-all;
              border-top: 1px solid #30363d; background: #161b22; }
  .url-line code { color: #58a6ff; }
  .url-line:empty { display: none; }
  #status { color: #8b949e; font-size: 13px; margin-top: 10px; min-height: 1.2em; }
  footer { margin-top: 32px; color: #8b949e; font-size: 13px; text-align: center; }
  a { color: #58a6ff; }
</style>
</head>
<body>
<main>
  <h1>&#128049; YourTomo <span style="color:#8b949e;font-weight:400">&middot; live preview</span></h1>
  <p class="sub">The friend that lives on your GitHub profile � see all four SVGs, live.
     No install, nothing stored.</p>
  <form id="f">
    <input id="u" type="text" placeholder="github username" autocomplete="off"
           spellcheck="false" required>
    <select id="s" title="pet state">${STATE_OPTIONS}</select>
    <span class="theme-toggle">
      <label><input type="radio" name="theme" value="dark" checked><span>dark</span></label>
      <label><input type="radio" name="theme" value="light"><span>light</span></label>
    </span>
    <button type="submit">summon the cat</button>
  </form>
  <div id="status"></div>
  <div id="gallery" hidden>
    ${CARDS}
  </div>
  <footer>
    <p>Live data from the public GitHub API &middot; cached 5 minutes &middot; read-only.
       <a href="https://github.com/prsdx/github-pet">Get your own YourTomo </a>.</p>
  </footer>
</main>
<script>
var f = document.getElementById('f'),
    u = document.getElementById('u'),
    s = document.getElementById('s'),
    gallery = document.getElementById('gallery'),
    statusEl = document.getElementById('status');
var reactive = { pet: true, isocat: true, graph: true, langs: false };
var loading = {};
function buildUrl(id, theme) {
  var p = new URLSearchParams();
  p.set('username', u.value.trim());
  if (reactive[id] && s.value) p.set('state', s.value);
  p.set('theme', theme);
  p.set('type', id);
  return '/preview?' + p.toString();
}
function go(e) {
  if (e) e.preventDefault();
  if (!u.value.trim()) { u.focus(); return; }
  gallery.hidden = false;
  statusEl.textContent = 'rendering...';
  var theme = document.querySelector('input[name=theme]:checked').value;
  var ids = ['pet','isocat','graph','langs'];
  for (var i = 0; i < ids.length; i++) {
    var id = ids[i];
    var img = document.getElementById(id);
    var wrap = img.parentElement;
    var src = buildUrl(id, theme);
    loading[id] = true;
    wrap.classList.add('loading');
    img.onload = (function(imgid, w, t) { return function() {
      var el = document.getElementById(imgid);
      w.classList.remove('loading');
      loading[imgid] = false;
      var urlEl = document.getElementById(imgid + '-url');
      urlEl.innerHTML = '<code>' + location.origin + buildUrl(imgid, t) + '</code>';
      allDone();
    };})(id, wrap, theme);
    img.onerror = (function(imgid, w) { return function() {
      w.classList.remove('loading');
      loading[imgid] = false;
      allDone();
    };})(id, wrap);
    img.src = src;
  }
}
function allDone() {
  for (var k in loading) if (loading[k]) return;
  statusEl.textContent = '';
}
f.addEventListener('submit', go);
s.addEventListener('change', go);
Array.prototype.forEach.call(document.querySelectorAll('input[name=theme]'), function (r) {
  r.addEventListener('change', go);
});
var pre = new URLSearchParams(location.search).get('username');
if (pre) { u.value = pre; go(); }
</script>
</body>
</html>
`;
