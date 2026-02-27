// ── Script data ────────────────────────────────────────────────────────────
let SCRIPTS = {};
// Load scripts data from external JSON
fetch('../assets/script.json')
  .then(res => res.json())
  .then(data => {
    SCRIPTS = data;
    console.log('HYPR LAB | Scripts loaded');
    if (typeof renderCards === 'function') renderCards();
  })
  .catch(err => console.error('Error loading scripts:', err));

// ── Card generation ──────────────────────────────────────────────────────────
function renderCards() {
  const grid = document.getElementById('cards-grid');
  if (!grid) return;

  grid.innerHTML = Object.keys(SCRIPTS).map(id => {
    const s = SCRIPTS[id];
    const badgesHtml = s.badges.map(([label, cls]) =>
      `<div class="card-badge ${cls}">${label}</div>`
    ).join('');

    return `
            <div class="card ${s.blue ? 'blue ' : ''}reveal" onclick="openScript('${id}')">
                <div class="card-tag">${s.tag}</div>
                <div class="card-name">${s.title}</div>
                <div class="card-desc">${s.desc}</div>
                <div class="card-meta">
                    ${badgesHtml}
                </div>
            </div>`;
  }).join('');

  // Re-observe new elements for reveal animation
  if (typeof ro !== 'undefined') {
    grid.querySelectorAll('.reveal').forEach(el => ro.observe(el));
  }
}

// ── Modal logic ────────────────────────────────────────────────────────────
function openScript(id) {
  const s = SCRIPTS[id];
  if (!s) return;
  document.getElementById('modal-tag').textContent = s.tag;
  document.getElementById('modal-tag').className = 'modal-tag' + (s.blue ? ' blue' : '');
  document.getElementById('modal-title').textContent = s.title;
  document.getElementById('modal-desc').textContent = s.desc;
  document.getElementById('modal-code').textContent = s.code;
  const footer = document.getElementById('modal-footer');
  footer.innerHTML = s.badges.map(([label, cls]) =>
    `<div class="modal-badge ${cls}">${label}</div>`
  ).join('') + `<div style="margin-left:auto;font-size:9px;letter-spacing:0.18em;color:var(--dimmer)">HYPR LAB</div>`;
  document.getElementById('copy-btn').textContent = 'Copy Script';
  document.getElementById('copy-btn').className = 'modal-copy-btn';
  document.getElementById('modal-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModalDirect() {
  document.getElementById('modal-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

function closeModal(e) {
  if (e.target === document.getElementById('modal-overlay')) closeModalDirect();
}

function copyScript() {
  const code = document.getElementById('modal-code').textContent;
  navigator.clipboard.writeText(code).then(() => {
    const btn = document.getElementById('copy-btn');
    btn.textContent = '✓ Copied!';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = 'Copy Script';
      btn.classList.remove('copied');
    }, 2000);
  });
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModalDirect();
});

// Disable right click
document.addEventListener('contextmenu', (e) => e.preventDefault());

// ── Mobile menu ────────────────────────────────────────────────────────────
function toggleMenu() {
  const hb = document.getElementById('hamburger');
  const mm = document.getElementById('mobile-menu');
  hb.classList.toggle('open');
  mm.classList.toggle('open');
  document.body.style.overflow = mm.classList.contains('open') ? 'hidden' : '';
}
function closeMenu() {
  document.getElementById('hamburger').classList.remove('open');
  document.getElementById('mobile-menu').classList.remove('open');
  document.body.style.overflow = '';
}

// ── Ticker ─────────────────────────────────────────────────────────────────
const ticker = document.getElementById('ticker');
function randHex(n) { return Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16).toUpperCase()).join(''); }
const terms = ['getgenv', 'hookfunction', 'loadstring', 'syn.request', 'Drawing.new', 'getrawmetatable', 'setreadonly', 'firetouchinterest', 'RunService', 'workspace', 'game:GetService', 'pcall', 'coroutine.wrap', 'task.wait', 'debug.getinfo'];
function updateTicker() {
  ticker.textContent = Array.from({ length: 16 }, (_, i) => `${terms[i % terms.length]}  ::${randHex(3)}`).join('\n');
}
updateTicker();
setInterval(updateTicker, 140);

// ── Nav solid on scroll ────────────────────────────────────────────────────
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('solid', window.scrollY > 40);
  document.body.classList.toggle('scrolled', window.scrollY > 80);
});

// ── Scroll reveal ──────────────────────────────────────────────────────────
const reveals = document.querySelectorAll('.reveal');
const ro = new IntersectionObserver((entries) => {
  entries.forEach((e, i) => {
    if (e.isIntersecting) {
      setTimeout(() => e.target.classList.add('visible'), 80);
    }
  });
}, { threshold: 0.1 });
reveals.forEach(el => ro.observe(el));


// ── Topographic canvas ─────────────────────────────────────────────────────
const canvas = document.getElementById('topo-canvas');
const ctx = canvas.getContext('2d');
let W, H;
function resize() { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; }
resize();
window.addEventListener('resize', resize);

const P2 = new Uint8Array(512);
(function () {
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) { const j = Math.random() * (i + 1) | 0;[p[i], p[j]] = [p[j], p[i]]; }
  for (let i = 0; i < 512; i++) P2[i] = p[i & 255];
})();
function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
function lrp(a, b, t) { return a + (b - a) * t; }
function g3(h, x, y, z) { const u = (h & 1) ? -x : x, v = (h & 2) ? -y : y; return (h & 4) ? -u - v + ((h & 8) ? -z : z) : u + v + ((h & 8) ? -z : z); }
function noise(x, y, z) {
  const xi = Math.floor(x) & 255, yi = Math.floor(y) & 255, zi = Math.floor(z) & 255;
  const xf = x - Math.floor(x), yf = y - Math.floor(y), zf = z - Math.floor(z);
  const u = fade(xf), v = fade(yf), w = fade(zf);
  const A = P2[xi] + yi, B = P2[xi + 1] + yi;
  return lrp(lrp(lrp(g3(P2[P2[A + zi]], xf, yf, zf), g3(P2[P2[B + zi]], xf - 1, yf, zf), u), lrp(g3(P2[P2[A + 1 + zi]], xf, yf - 1, zf), g3(P2[P2[B + 1 + zi]], xf - 1, yf - 1, zf), u), v), lrp(lrp(g3(P2[P2[A + zi + 1]], xf, yf, zf - 1), g3(P2[P2[B + zi + 1]], xf - 1, yf, zf - 1), u), lrp(g3(P2[P2[A + 1 + zi + 1]], xf, yf - 1, zf - 1), g3(P2[P2[B + 1 + zi + 1]], xf - 1, yf - 1, zf - 1), u), v), w);
}
function fbm(x, y, z) { return (noise(x, y, z) * 0.5 + noise(x * 2.1, y * 2.1, z * 2.1) * 0.25 + noise(x * 4.3, y * 4.3, z * 4.3) * 0.125 + noise(x * 8.7, y * 8.7, z * 8.7) * 0.0625) * 0.94 + 0.5; }

const COLS = 120; let ROWS, grid;
function buildGrid(t) {
  ROWS = Math.round(COLS * H / W);
  const need = (COLS + 1) * (ROWS + 1);
  if (!grid || grid.length !== need) grid = new Float32Array(need);
  for (let j = 0; j <= ROWS; j++) for (let i = 0; i <= COLS; i++) {
    const nx = (i / COLS - 0.5) * 2.8, ny = (j / ROWS - 0.5) * 2.8 * (H / W);
    grid[j * (COLS + 1) + i] = fbm(nx, ny, t);
  }
}
function drawContour(threshold, bright, alpha, lw) {
  const cw = W / COLS, rh = H / ROWS;
  function li(a, b) { const d = b - a; return Math.abs(d) < 1e-9 ? .5 : Math.max(0, Math.min(1, (threshold - a) / d)); }
  ctx.strokeStyle = `rgba(${bright},${bright},${bright},${alpha})`;
  ctx.lineWidth = lw;
  ctx.beginPath();
  for (let j = 0; j < ROWS; j++) for (let i = 0; i < COLS; i++) {
    const v0 = grid[j * (COLS + 1) + i], v1 = grid[j * (COLS + 1) + i + 1];
    const v2 = grid[(j + 1) * (COLS + 1) + i + 1], v3 = grid[(j + 1) * (COLS + 1) + i];
    const c = (v0 > threshold ? 8 : 0) | (v1 > threshold ? 4 : 0) | (v2 > threshold ? 2 : 0) | (v3 > threshold ? 1 : 0);
    if (c === 0 || c === 15) continue;
    const x0 = i * cw, x1 = (i + 1) * cw, y0 = j * rh, y1 = (j + 1) * rh;
    const tx = x0 + li(v0, v1) * (x1 - x0), ty = y0, rx = x1, ry = y0 + li(v1, v2) * (y1 - y0);
    const bx = x0 + li(v3, v2) * (x1 - x0), by = y1, lx2 = x0, ly = y0 + li(v0, v3) * (y1 - y0);
    let a1, b1, a2, b2, a3, b3, a4, b4;
    switch (c) {
      case 1: case 14: a1 = lx2; b1 = ly; a2 = bx; b2 = by; break;
      case 2: case 13: a1 = bx; b1 = by; a2 = rx; b2 = ry; break;
      case 3: case 12: a1 = lx2; b1 = ly; a2 = rx; b2 = ry; break;
      case 4: case 11: a1 = rx; b1 = ry; a2 = tx; b2 = ty; break;
      case 6: case 9: a1 = tx; b1 = ty; a2 = bx; b2 = by; break;
      case 7: case 8: a1 = tx; b1 = ty; a2 = lx2; b2 = ly; break;
      case 5: a1 = tx; b1 = ty; a2 = rx; b2 = ry; a3 = bx; b3 = by; a4 = lx2; b4 = ly; break;
      case 10: a1 = tx; b1 = ty; a2 = lx2; b2 = ly; a3 = bx; b3 = by; a4 = rx; b4 = ry; break;
    }
    ctx.moveTo(a1, b1); ctx.lineTo(a2, b2);
    if (c === 5 || c === 10) { ctx.moveTo(a3, b3); ctx.lineTo(a4, b4); }
  }
  ctx.stroke();
}

const NL = 60; let t = 0;
function draw() {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.setLineDash([]);
  buildGrid(t * 0.18);
  for (let b = 0; b < NL; b++) {
    const n = b / (NL - 1), thresh = 0.06 + n * 0.86, maj = b % 5 === 0;
    drawContour(thresh, Math.floor(80 + n * 175) | 0, maj ? .95 : .38 + n * .45, maj ? 1.4 : .65);
  }
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * .15, W / 2, H / 2, H * .88);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.72)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  t += 0.004;
  requestAnimationFrame(draw);
}
draw();
