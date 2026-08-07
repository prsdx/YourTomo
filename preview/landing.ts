// Landing page for the live preview - plain HTML/JS, no framework, in the
// same zero-heavy-dependency spirit as the rest of the repo. The state
// dropdown is built from VALID_STATES so it can never drift from the
// state machine's idea of a valid state.

import { VALID_STATES } from "../src/state.ts";

const STATE_OPTIONS = [
    `<option value="" selected>auto (real data)</option>`,
    ...VALID_STATES.map((s) => `<option value="${s}">${s}</option>`),
].join("");

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
         display: flex; flex-direction: column; align-items: center; padding: 48px 16px; }
  main { width: 100%; max-width: 940px; }
  h1 { font-size: 28px; margin: 0 0 4px; }
  p.sub { color: #8b949e; margin: 0 0 24px; }
  form { display: flex; flex-wrap: wrap; gap: 10px; align-items: center;
         background: #161b22; border: 1px solid #30363d; border-radius: 10px; padding: 14px; }
  input[type=text], select { background: #0d1117; color: #e6edf3; border: 1px solid #30363d;
         border-radius: 6px; padding: 9px 12px; font: inherit; }
  input[type=text] { flex: 1 1 200px; }
  .theme-toggle { display: inline-flex; border: 1px solid #30363d; border-radius: 6px; overflow: hidden; }
  .theme-toggle label { padding: 9px 14px; cursor: pointer; color: #8b949e; user-select: none; }
  .theme-toggle input { display: none; }
  .theme-toggle input:checked + span { color: #e6edf3; font-weight: 600; }
  button { background: #238636; border: 0; color: #fff; border-radius: 6px; padding: 10px 18px;
           font: inherit; font-weight: 600; cursor: pointer; }
  button:hover { background: #2ea043; }
  #stage { margin-top: 24px; }
  #pet { width: 100%; display: block; border-radius: 10px; background: #0d1117;
         border: 1px solid #30363d; transition: opacity .2s; }
  #status { color: #8b949e; font-size: 13px; margin-top: 8px; min-height: 1.2em; }
  #url-line { font-size: 13px; color: #8b949e; word-break: break-all; }
  #url-line code { color: #58a6ff; }
  footer { margin-top: 40px; color: #8b949e; font-size: 13px; text-align: center; }
  a { color: #58a6ff; }
</style>
</head>
<body>
<main>
  <h1>&#128049; YourTomo <span style="color:#8b949e;font-weight:400">&middot; live preview</span></h1>
  <p class="sub">The pixel cat that lives on your GitHub profile and reacts to what you
     actually do. Try it on your own data &mdash; no install, read-only, nothing is stored.</p>
  <form id="f">
    <input id="u" type="text" placeholder="github username" autocomplete="off" spellcheck="false" required>
    <select id="s" title="pet state">${STATE_OPTIONS}</select>
    <span class="theme-toggle">
      <label><input type="radio" name="theme" value="dark" checked><span>dark</span></label>
      <label><input type="radio" name="theme" value="light"><span>light</span></label>
    </span>
    <button type="submit">summon the cat</button>
  </form>
  <div id="stage" hidden>
    <img id="pet" alt="your github pet, rendered live">
    <div id="status"></div>
    <div id="url-line"></div>
  </div>
  <footer>
    <p>Live data from the public GitHub API &middot; cached 5 minutes &middot; read-only:
       no write tokens, nothing committed anywhere.<br>
       Like it? <a href="https://github.com/prsdx/github-pet">Get your own YourTomo cat</a>
       &mdash; free, one workflow file.</p>
  </footer>
</main>
<script>
var f = document.getElementById('f'), u = document.getElementById('u'),
    s = document.getElementById('s'), img = document.getElementById('pet'),
    stage = document.getElementById('stage'), statusEl = document.getElementById('status'),
    urlLine = document.getElementById('url-line');
function previewUrl() {
  var p = new URLSearchParams();
  p.set('username', u.value.trim());
  if (s.value) p.set('state', s.value);
  p.set('theme', document.querySelector('input[name=theme]:checked').value);
  return '/preview?' + p.toString();
}
function go(e) {
  if (e) e.preventDefault();
  if (!u.value.trim()) { u.focus(); return; }
  var src = previewUrl();
  stage.hidden = false;
  statusEl.textContent = 'waking the cat up...';
  img.style.opacity = '0.4';
  img.onload = function () { img.style.opacity = '1'; statusEl.textContent = ''; };
  img.onerror = function () { img.style.opacity = '1'; statusEl.textContent = 'something went wrong - check the username and try again.'; };
  img.src = src;
  urlLine.innerHTML = 'direct link: <code>' + location.origin + src + '</code>';
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
