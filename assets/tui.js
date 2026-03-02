// ═══════════════════════════════════════
//  TUI Index – Main Script
// ═══════════════════════════════════════

(() => {
    'use strict';

    // ── DOM refs ────────────────────────
    const envList = document.getElementById('env-list');
    const envItems = envList.querySelectorAll('li');
    const detailsPane = document.getElementById('details-pane');
    const progressFill = document.getElementById('progress-fill');
    const datetimeEl = document.getElementById('datetime');
    const bootOverlay = document.getElementById('boot-overlay');
    const bootText = document.getElementById('boot-text');
    const searchBox = document.getElementById('search-box');
    const actionsList = document.getElementById('actions-list');
    const toastEl = document.getElementById('toast');
    const configOverlay = document.getElementById('config-overlay');
    const configClose = document.getElementById('config-close');
    const configSave = document.getElementById('config-save');
    const configReset = document.getElementById('config-reset');
    const configColors = document.getElementById('config-colors');

    let currentIndex = 0;
    let navigating = false;

    // ═══════════════════════════════════
    //  Configuration System (localStorage)
    // ═══════════════════════════════════
    const STORAGE_KEY = 'tui-config';

    const DEFAULTS = {
        scanlines: true,
        boot: true,
        glow: true,
        'idle-bar': true,
        accent: '#e2804b'
    };

    function loadConfig() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) return Object.assign({}, DEFAULTS, JSON.parse(raw));
        } catch (_) { /* ignore */ }
        return Object.assign({}, DEFAULTS);
    }

    function saveConfig(cfg) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
    }

    let config = loadConfig();

    // Apply config to the page
    function applyConfig(cfg) {
        // Scanlines
        document.body.classList.toggle('no-scanlines', !cfg.scanlines);

        // Glow
        document.body.classList.toggle('no-glow', !cfg.glow);

        // Accent color
        const r = document.documentElement;
        r.style.setProperty('--accent', cfg.accent);
        r.style.setProperty('--border-active', cfg.accent);

        // Compute a glow color from the accent
        const hex = cfg.accent.replace('#', '');
        const rr = parseInt(hex.substring(0, 2), 16);
        const gg = parseInt(hex.substring(2, 4), 16);
        const bb = parseInt(hex.substring(4, 6), 16);
        r.style.setProperty('--accent-glow', `rgba(${rr}, ${gg}, ${bb}, 0.25)`);
    }

    // Sync the config modal UI to current cfg
    function syncConfigUI(cfg) {
        // Checkboxes
        ['scanlines', 'boot', 'glow', 'idle-bar'].forEach(key => {
            const el = document.getElementById('chk-' + key);
            if (el) el.classList.toggle('checked', !!cfg[key]);
        });

        // Color swatches
        configColors.querySelectorAll('.config-swatch').forEach(sw => {
            sw.classList.toggle('active', sw.getAttribute('data-color') === cfg.accent);
        });
    }

    function openConfig() {
        syncConfigUI(config);
        configOverlay.classList.add('open');
    }

    function closeConfig() {
        configOverlay.classList.remove('open');
    }

    // Toggle handlers
    document.querySelectorAll('.config-option').forEach(opt => {
        opt.addEventListener('click', () => {
            const key = opt.getAttribute('data-key');
            config[key] = !config[key];
            syncConfigUI(config);
            applyConfig(config);
        });
    });

    // Color swatch handlers
    configColors.querySelectorAll('.config-swatch').forEach(sw => {
        sw.addEventListener('click', () => {
            config.accent = sw.getAttribute('data-color');
            syncConfigUI(config);
            applyConfig(config);
        });
    });

    configClose.addEventListener('click', closeConfig);
    configOverlay.addEventListener('click', (e) => {
        if (e.target === configOverlay) closeConfig();
    });

    configSave.addEventListener('click', () => {
        saveConfig(config);
        closeConfig();
        showToast('[ok] Configuration saved.');
    });

    configReset.addEventListener('click', () => {
        config = Object.assign({}, DEFAULTS);
        saveConfig(config);
        syncConfigUI(config);
        applyConfig(config);
        showToast('[ok] Defaults restored.');
    });

    // Apply saved config on load
    applyConfig(config);

    // ── Uptime tracker ─────────────────
    const bootTime = Date.now();

    function pad(n) { return n < 10 ? '0' + n : n; }

    function getUptime() {
        const d = Date.now() - bootTime;
        const h = Math.floor(d / 3600000);
        const m = Math.floor((d % 3600000) / 60000);
        const s = Math.floor((d % 60000) / 1000);
        if (h > 0) return `${h}h ${pad(m)}m ${pad(s)}s`;
        if (m > 0) return `${m}m ${pad(s)}s`;
        return `${s}s`;
    }

    // ── Toast notifications ────────────
    let toastTimer = null;
    function showToast(msg) {
        toastEl.textContent = msg;
        toastEl.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => {
            toastEl.classList.remove('show');
        }, 2500);
    }

    // ── Selection logic ────────────────
    function updateSelection() {
        envItems.forEach((item, i) => {
            if (i === currentIndex) {
                item.classList.add('selected');
                let desc = item.getAttribute('data-desc');
                desc = desc.replace(/\{uptime\}/g, getUptime());
                detailsPane.textContent = desc.replace(/\\n/g, '\n');
            } else {
                item.classList.remove('selected');
            }
        });
    }

    function executeSelection() {
        const url = envItems[currentIndex].getAttribute('data-url');
        if (!url || navigating) return;
        navigating = true;

        progressFill.style.transition = 'width 0.35s ease';
        progressFill.style.width = '100%';

        setTimeout(() => { window.location.href = url; }, 400);
    }

    // ── Keyboard navigation ────────────
    document.addEventListener('keydown', (e) => {
        // Close config on Escape
        if (configOverlay.classList.contains('open')) {
            if (e.key === 'Escape') closeConfig();
            return;
        }

        // Don't intercept when search is focused
        if (document.activeElement === searchBox) {
            if (e.key === 'Escape') {
                searchBox.blur();
                searchBox.value = '';
                filterSearch('');
            }
            return;
        }

        switch (e.key) {
            case 'ArrowUp':
            case 'k':
                currentIndex = currentIndex > 0 ? currentIndex - 1 : envItems.length - 1;
                updateSelection();
                e.preventDefault();
                break;
            case 'ArrowDown':
            case 'j':
                currentIndex = currentIndex < envItems.length - 1 ? currentIndex + 1 : 0;
                updateSelection();
                e.preventDefault();
                break;
            case 'Enter':
                executeSelection();
                break;
            case '/':
                searchBox.focus();
                e.preventDefault();
                break;
        }
    });

    // ── Mouse navigation ───────────────
    envItems.forEach((item, i) => {
        item.addEventListener('mouseenter', () => {
            currentIndex = i;
            updateSelection();
        });
        item.addEventListener('click', executeSelection);
    });

    // ── Quick Actions ──────────────────
    if (actionsList) {
        const actionHandlers = {
            'configure': () => {
                openConfig();
            },
            'update': () => {
                showToast('[..] Checking for package updates...');
                setTimeout(() => showToast('[ok] All packages are up to date.'), 2000);
            },
            'terminal': () => {
                showToast('[>>] Opening terminal emulator...');
            },
            'monitor': () => {
                const mem = Math.floor(Math.random() * 40 + 30);
                const cpu = Math.floor(Math.random() * 25 + 5);
                showToast(`[sys] CPU: ${cpu}% | MEM: ${mem}% | DISK: 57%`);
            },
            'restart-net': () => {
                showToast('[..] Restarting network...');
                setTimeout(() => location.reload(), 1200);
            },
            'reboot': () => {
                showToast('[!!] System reboot initiated...');
                setTimeout(() => location.reload(), 1200);
            }
        };

        actionsList.querySelectorAll('li[data-action]').forEach(item => {
            item.addEventListener('click', () => {
                const action = item.getAttribute('data-action');
                if (actionHandlers[action]) actionHandlers[action]();
            });
        });
    }

    // ── Search functionality ───────────
    function getAllSearchableItems() {
        const items = [];
        envItems.forEach(el => {
            items.push({
                label: el.textContent.trim(),
                type: 'env',
                element: el,
                action: () => {
                    const idx = Array.from(envItems).indexOf(el);
                    currentIndex = idx;
                    updateSelection();
                }
            });
        });
        if (actionsList) {
            actionsList.querySelectorAll('li[data-action]').forEach(el => {
                items.push({
                    label: el.textContent.trim(),
                    type: 'action',
                    element: el,
                    action: () => el.click()
                });
            });
        }
        return items;
    }

    let searchResults = [];
    let searchSelectedIdx = -1;

    function filterSearch(query) {
        const all = getAllSearchableItems();
        if (!query.trim()) {
            detailsPane.textContent = '';
            updateSelection();
            searchResults = [];
            searchSelectedIdx = -1;
            return;
        }

        const q = query.toLowerCase();
        searchResults = all.filter(item => item.label.toLowerCase().includes(q));
        searchSelectedIdx = searchResults.length > 0 ? 0 : -1;

        renderSearchResults();
    }

    function renderSearchResults() {
        if (searchResults.length === 0) {
            detailsPane.textContent = 'No results found.';
            return;
        }

        let text = '── Search Results ──\n\n';
        searchResults.forEach((r, i) => {
            const prefix = i === searchSelectedIdx ? '> ' : '  ';
            const tag = r.type === 'env' ? '[ENV]' : '[ACT]';
            text += `${prefix}${tag} ${r.label}\n`;
        });
        text += '\n──────────────────\nENTER to select | ESC to clear';
        detailsPane.textContent = text;
    }

    if (searchBox) {
        searchBox.addEventListener('input', () => {
            filterSearch(searchBox.value);
        });

        searchBox.addEventListener('keydown', (e) => {
            if (searchResults.length > 0) {
                if (e.key === 'ArrowDown') {
                    searchSelectedIdx = (searchSelectedIdx + 1) % searchResults.length;
                    renderSearchResults();
                    e.preventDefault();
                } else if (e.key === 'ArrowUp') {
                    searchSelectedIdx = searchSelectedIdx > 0 ? searchSelectedIdx - 1 : searchResults.length - 1;
                    renderSearchResults();
                    e.preventDefault();
                } else if (e.key === 'Enter') {
                    if (searchSelectedIdx >= 0 && searchResults[searchSelectedIdx]) {
                        searchResults[searchSelectedIdx].action();
                        searchBox.value = '';
                        searchBox.blur();
                        filterSearch('');
                    }
                    e.preventDefault();
                }
            }
        });
    }

    // ── Clock + uptime refresh ─────────
    function tick() {
        const now = new Date();
        let h = now.getHours();
        const m = pad(now.getMinutes());
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
        datetimeEl.textContent = `40% | 57% | ${h}:${m} ${ampm}`;

        if (!searchBox || !searchBox.value.trim()) {
            updateSelection();
        }
    }

    setInterval(tick, 1000);
    tick();

    // ── Boot sequence ──────────────────
    if (config.boot && bootOverlay && bootText) {
        const lines = [
            '[    0.000000] Incoming GET request from 127.0.0.1',
            '[    0.001021] Handshake complete.',
            '[    0.002241] Loading index.html',
            '[    0.004213] Loading assets/tui.js',
            '[    0.008412] Loading assets/tui.css',
            '[    0.018231] Initializing stylesheet...',
            '[    0.034125] Constructing DOM tree...',
            '[    0.082143] Mounting environment selector',
            '[    0.104251] Starting uptime counter',
            '[    0.134231] Registering keyboard hooks',
            '[    0.155231] Binding UI events',
            '[    0.192341] All systems nominal.',
            '[    0.205121] Connection established.',
        ];

        let idx = 0;
        document.body.style.overflow = 'hidden';

        function showBootLine() {
            if (idx >= lines.length) {
                setTimeout(() => {
                    bootOverlay.classList.add('hidden');
                    document.body.style.overflow = '';
                    startIdleProgress();
                }, 350);
                return;
            }

            const div = document.createElement('div');
            div.className = 'boot-line';
            div.textContent = lines[idx];
            bootText.appendChild(div);
            idx++;

            const delay = lines[idx - 1].includes('Loading') ? 120 :
                lines[idx - 1].includes('established') ? 350 :
                    Math.random() * 35 + 12;

            setTimeout(showBootLine, delay);
        }

        setTimeout(showBootLine, 80);
    } else {
        // Skip boot or no overlay element
        if (bootOverlay) bootOverlay.classList.add('hidden');
        startIdleProgress();
    }

    // ── Idle progress bar ──────────────
    function startIdleProgress() {
        if (!config['idle-bar']) return;

        let prog = 0;

        function animate() {
            if (navigating) return;
            if (prog >= 65) return;

            prog += 0.05;
            progressFill.style.width = prog + '%';
            requestAnimationFrame(animate);
        }

        requestAnimationFrame(animate);
    }

})();
