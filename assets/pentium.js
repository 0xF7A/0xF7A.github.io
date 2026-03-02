// ═══════════════════════════════════════
//  PENTIUM – Python Showcase Script
// ═══════════════════════════════════════

// ── Script data ────────────────────────
let SCRIPTS = {};
// Load scripts data from external JSON
fetch('../assets/pentium_script.json')
    .then(res => res.json())
    .then(data => {
        SCRIPTS = data;
        console.log('PENTIUM | Scripts loaded');
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
                <div class="card-meta">${badgesHtml}</div>
            </div>`;
    }).join('');

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
    ).join('') + `<div style="margin-left:auto;font-size:9px;letter-spacing:0.18em;color:var(--dimmer)">PENTIUM</div>`;
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
        btn.textContent = 'Copied!';
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

// ── Mobile Menu ──────────────────────────────────────────────────────────
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
const pyTerms = ['import', 'def', 'async', 'await', 'yield', 'lambda', '__init__', 'self', 'flask', 'pandas', 'numpy', 'requests', 'asyncio', 'subprocess', 'json.loads'];
function randHex(n) { return Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16).toUpperCase()).join(''); }
function updateTicker() {
    ticker.textContent = Array.from({ length: 16 }, (_, i) => `${pyTerms[i % pyTerms.length]}  ::${randHex(3)}`).join('\n');
}
updateTicker();
setInterval(updateTicker, 160);

// ── Nav solid on scroll ────────────────────────────────────────────────────
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
    nav.classList.toggle('solid', window.scrollY > 40);
    document.body.classList.toggle('scrolled', window.scrollY > 80);
});

// ── Scroll reveal ──────────────────────────────────────────────────────────
const reveals = document.querySelectorAll('.reveal');
const ro = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
        if (e.isIntersecting) {
            setTimeout(() => e.target.classList.add('visible'), 80);
        }
    });
}, { threshold: 0.1 });
reveals.forEach(el => ro.observe(el));

// ── Particle Web Canvas ────────────────────────────────────────────────────
const canvas = document.getElementById('matrix-canvas');
const ctx = canvas.getContext('2d');

let W, H;
function resize() { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; }
resize();
window.addEventListener('resize', resize);

const PARTICLE_COUNT = 80;
const CONNECT_DIST = 160;
const DOT_RADIUS = 1.8;

class Particle {
    constructor() { this.reset(); }
    reset() {
        this.x = Math.random() * W;
        this.y = Math.random() * H;
        this.vx = (Math.random() - 0.5) * 0.4;
        this.vy = (Math.random() - 0.5) * 0.4;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < 0 || this.x > W) this.vx *= -1;
        if (this.y < 0 || this.y > H) this.vy *= -1;
    }
}

let particles = Array.from({ length: PARTICLE_COUNT }, () => new Particle());
window.addEventListener('resize', () => {
    particles.forEach(p => {
        if (p.x > W) p.x = W * Math.random();
        if (p.y > H) p.y = H * Math.random();
    });
});

function drawWeb() {
    ctx.clearRect(0, 0, W, H);

    // Draw connections
    for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
            const dx = particles[i].x - particles[j].x;
            const dy = particles[i].y - particles[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < CONNECT_DIST) {
                const alpha = (1 - dist / CONNECT_DIST) * 0.35;
                ctx.strokeStyle = `rgba(0, 212, 170, ${alpha})`;
                ctx.lineWidth = 0.6;
                ctx.beginPath();
                ctx.moveTo(particles[i].x, particles[i].y);
                ctx.lineTo(particles[j].x, particles[j].y);
                ctx.stroke();
            }
        }
    }

    // Draw dots
    for (const p of particles) {
        p.update();
        ctx.fillStyle = 'rgba(0, 212, 170, 0.7)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, DOT_RADIUS, 0, Math.PI * 2);
        ctx.fill();
    }

    requestAnimationFrame(drawWeb);
}
drawWeb();

// ── Terminal Animation ────────────────────────────────────────────────────
const termBody = document.getElementById('term-body');
if (termBody) {
    const termLines = [
        { type: 'prompt', text: '$ python3 server.py' },
        { type: 'output', text: ' * Serving Flask app "server"' },
        { type: 'output', text: ' * Environment: production' },
        { type: 'success', text: ' * Running on http://127.0.0.1:5000' },
        { type: 'prompt', text: '$ curl -s localhost:5000/api/status' },
        { type: 'output', text: '{"status": "running", "uptime": "14h 23m"}' },
        { type: 'prompt', text: '$ python3 -m pytest tests/ -v' },
        { type: 'output', text: 'tests/test_api.py::test_health PASSED' },
        { type: 'output', text: 'tests/test_api.py::test_auth PASSED' },
        { type: 'output', text: 'tests/test_ws.py::test_connect PASSED' },
        { type: 'success', text: '====== 3 passed in 0.42s ======' },
        { type: 'prompt', text: '$ _' },
    ];

    let tIdx = 0;
    function showTermLine() {
        if (tIdx >= termLines.length) return;
        const line = termLines[tIdx];
        const div = document.createElement('div');
        div.className = line.type;
        div.textContent = line.text;
        div.style.opacity = '0';
        div.style.animation = 'bootFadeIn 0.15s ease forwards';
        termBody.appendChild(div);
        tIdx++;
        setTimeout(showTermLine, line.type === 'prompt' ? 600 : 200);
    }

    // Start when section is visible
    const termSection = document.getElementById('terminal');
    const termObserver = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
            showTermLine();
            termObserver.disconnect();
        }
    }, { threshold: 0.3 });
    termObserver.observe(termSection);
}

// ── Boot Sequence ────────────────────────────────────────────────────────
const bootScreen = document.getElementById('boot-screen');
const bootTextEl = document.getElementById('boot-text');

if (bootScreen && bootTextEl) {
    const bootLines = [
        '[    0.000000] Incoming GET request from 127.0.0.1',
        '[    0.000812] Handshake complete.',
        '[    0.001433] Loading pentium/index.html',
        '[    0.003812] Loading assets/pentium.css',
        '[    0.006221] Loading assets/pentium.js',
        '[    0.012312] Initializing Python runtime...',
        '[    0.024521] Importing modules: flask, asyncio, pandas',
        '[    0.038123] Resolving dependencies...',
        '[    0.052341] Building virtual environment...',
        '[    0.068124] Starting WSGI server...',
        '[    0.082312] All systems nominal.',
        '[    0.092121] Connection established.',
    ];

    let bIdx = 0;
    document.body.style.overflow = 'hidden';
    window.scrollTo(0, 0);

    function showBootLine() {
        if (bIdx >= bootLines.length) {
            setTimeout(() => {
                bootScreen.classList.add('hidden');
                document.body.style.overflow = '';
            }, 300);
            return;
        }

        const div = document.createElement('div');
        div.className = 'boot-line';
        div.textContent = bootLines[bIdx];
        bootTextEl.appendChild(div);
        bIdx++;

        const currentLine = bootLines[bIdx - 1].toLowerCase();
        let delay = Math.random() * 30 + 10;
        if (currentLine.includes('loading') || currentLine.includes('importing')) delay = 140;
        else if (currentLine.includes('established')) delay = 350;

        setTimeout(showBootLine, delay);
    }

    setTimeout(showBootLine, 80);
}


