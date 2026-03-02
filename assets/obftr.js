// ══════════════════════════════════════════════════════════════════
//  HYPR LAB — Enhanced Luau Obfuscator v3.0
//  Techniques: variable rename, string encode, XOR cipher,
//  number split, bool encode, control flow flatten, garbage inject,
//  dead code inject, comment strip, whitespace minify,
//  constant fold, base64 wrap, identifier shuffle, multi-pass
// ══════════════════════════════════════════════════════════════════

// ── Helpers ────────────────────────────────────────────────────────────────

/** Read a checkbox option by its data-key attribute */
function getOpt(key) {
    const el = document.querySelector(`.obf-option[data-key="${key}"]`);
    return el ? el.classList.contains('checked') : false;
}

/** Generate a random lookalike identifier using l/I/i/O/o/0 */
function randVar(len) {
    const chars = 'lIiOo0';
    return '_' + Array.from({ length: len || 6 }, () =>
        chars[Math.floor(Math.random() * chars.length)]
    ).join('');
}

/** Generate a unique lookalike identifier within a local scope set */
function randVarUnique(used, len) {
    let name = randVar(len);
    while (used.has(name)) {
        name = randVar(len);
    }
    used.add(name);
    return name;
}

/** Generate a random integer in [min, max) */
function randInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}

/** Generate a random hex string of given length */
function randHex(len) {
    return Array.from({ length: len }, () =>
        Math.floor(Math.random() * 16).toString(16)
    ).join('');
}

/** Simple XOR of a string against a single-byte key */
function xorString(str, key) {
    return Array.from(str).map(c =>
        (c.charCodeAt(0) ^ key).toString()
    ).join(',');
}

/** Convert source text into Lua decimal byte escapes: \065\066... */
function toByteEscapePayload(str) {
    try {
        const bytes = new TextEncoder().encode(str);
        return Array.from(bytes, b => `\\${b.toString().padStart(3, '0')}`).join('');
    } catch {
        try {
            const utf8 = unescape(encodeURIComponent(str));
            return Array.from(utf8, ch => `\\${ch.charCodeAt(0).toString().padStart(3, '0')}`).join('');
        } catch {
            return Array.from(str, ch => `\\${(ch.charCodeAt(0) & 0xff).toString().padStart(3, '0')}`).join('');
        }
    }
}

/** All Luau keywords — never rename these */
const LUAU_KEYWORDS = new Set([
    'and', 'break', 'do', 'else', 'elseif', 'end', 'false', 'for', 'function',
    'if', 'in', 'local', 'nil', 'not', 'or', 'repeat', 'return', 'then', 'true',
    'until', 'while', 'continue',
    // common globals we must not rename
    'game', 'workspace', 'script', 'math', 'string', 'table', 'os', 'io', 'coroutine',
    'pcall', 'xpcall', 'error', 'assert', 'print', 'warn', 'type', 'tostring', 'tonumber',
    'pairs', 'ipairs', 'next', 'select', 'rawget', 'rawset', 'rawequal', 'rawlen',
    'setmetatable', 'getmetatable', 'require', 'loadstring', 'newproxy',
    'task', 'tick', 'wait', 'spawn', 'delay', 'typeof',
    'Vector2', 'Vector3', 'CFrame', 'Color3', 'UDim', 'UDim2', 'Rect', 'Region3',
    'Instance', 'Enum', 'game', 'Players', 'RunService', 'UserInputService',
    'ReplicatedStorage', 'ServerStorage', 'Workspace', 'Drawing',
    '_G', '_ENV', '__index', '__newindex', '__call', '__len', '__eq', '__lt', '__le',
    '__add', '__sub', '__mul', '__div', '__mod', '__pow', '__unm', '__concat',
]);

// ── Pass 1: Strip comments ─────────────────────────────────────────────────
function passStripComments(src) {
    // Remove --[[ multi-line ]] first
    let out = src.replace(/--\[\[[\s\S]*?\]\]/g, '');
    // Remove -- single-line (but not string contents)
    out = out.replace(/--[^\n]*/g, '');
    return out;
}

// ── Pass 2: Minify whitespace ──────────────────────────────────────────────
function passMinify(src) {
    return src
        .replace(/\t/g, ' ')
        .replace(/ {2,}/g, ' ')
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0)
        .join('\n');
}

// ── Pass 3: Bool obfuscation ───────────────────────────────────────────────
// true  → (not not not false)   false → (not not not true)
// Avoids simple pattern matching by varying depth per occurrence
function passBoolObf(src) {
    let trueCount = 0, falseCount = 0;
    src = src.replace(/\btrue\b/g, () => {
        const d = (trueCount++ % 3) + 1;
        // Odd number of NOTs keeps semantic value: not(false) => true
        return '(' + 'not '.repeat(d * 2 + 1) + 'false)';
    });
    src = src.replace(/\bfalse\b/g, () => {
        const d = (falseCount++ % 3) + 1;
        // Odd number of NOTs keeps semantic value: not(true) => false
        return '(' + 'not '.repeat(d * 2 + 1) + 'true)';
    });
    return src;
}

// ── Pass 4: String encoding ────────────────────────────────────────────────
// Strings are encoded as XOR-encrypted byte arrays with a random key
// and decoded at runtime via an inline Luau function
function passStringEncode(src) {
    return src.replace(
        /"([^"\\]*(\\.[^"\\]*)*)"|'([^'\\]*(\\.[^'\\]*)*)'/g,
        (m) => {
            const inner = m.slice(1, -1)
                .replace(/\\n/g, '\n').replace(/\\t/g, '\t')
                .replace(/\\\\/g, '\\').replace(/\\"/g, '"').replace(/\\'/g, "'");
            if (inner.length === 0) return m;
            if (inner.length > 200) return m; // skip very long strings

            const key = randInt(3, 250);
            const xored = xorString(inner, key);
            const localNames = new Set();
            const t = randVarUnique(localNames, 4);
            const k = randVarUnique(localNames, 4);
            const r = randVarUnique(localNames, 4);

            return `(function()`
                + ` local ${t}={${xored}}`
                + ` local ${r}={}`
                + ` for _,${k} in ipairs(${t}) do`
                + ` ${r}[#${r}+1]=string.char(bit32.bxor(${k},${key}))`
                + ` end`
                + ` return table.concat(${r})`
                + ` end)()`;
        }
    );
}

// ── Pass 5: Number encoding ────────────────────────────────────────────────
// Each number is split into a random multi-step arithmetic expression
// Supports 3 different encoding styles chosen randomly per number
function passNumberEncode(src) {
    // Match only standalone integer literals (not decimals like 0.05, not 0xFF, not identifiers like x1)
    return src.replace(/(^|[^A-Za-z0-9_.])(\d+)(?=$|[^A-Za-z0-9_.])/gm, (m, prefix, n) => {
        const v = parseInt(n);
        if (isNaN(v) || v < 2 || v > 99999) return m;

        const style = randInt(0, 4);
        if (style === 0) {
            // a + b where a+b = v
            const a = randInt(1, Math.max(2, v));
            return `${prefix}(${a}+(${v - a}))`;
        } else if (style === 1) {
            // a * b + c where a*b+c = v
            const a = randInt(2, 8);
            const b = Math.floor(v / a);
            const c = v - a * b;
            return `${prefix}((${a})*(${b})+(${c}))`;
        } else if (style === 2) {
            // bit32.bxor approach
            const mask = randInt(1, 255);
            const xv = v ^ mask;
            return `${prefix}(bit32.bxor(${xv},${mask}))`;
        } else {
            // math.floor wrapping
            const off = randInt(10, 500);
            return `${prefix}(math.floor(${v + off})-${off})`;
        }
    });
}

// ── Pass 6: Constant folding obfuscation ───────────────────────────────────
// After number encode, simple additions are re-obfuscated so
// decompilers can't trivially fold them back
function passConstantFold(src) {
    // Wrap bare literals with an identity-preserving arithmetic form.
    return src.replace(/(^|[^A-Za-z0-9_.])(\d{2,5})(?=$|[^A-Za-z0-9_.])/gm, (m, prefix, n) => {
        const v = parseInt(n);
        if (isNaN(v)) return m;
        const junk = randInt(1000, 9999);
        // ((v + junk) - junk) is always exactly v.
        return `${prefix}((math.max(${v + junk},${v + junk}))-${junk})`;
    });
}

// ── Pass 7: Variable renaming ──────────────────────────────────────────────
// - Collects all `local name` declarations
// - Maps them to unique lookalike identifiers
// - Replaces all references (won't touch keywords or globals)
function passRenameVars(src) {
    const nameMap = new Map();
    const usedNewNames = new Set();
    let idx = 0;

    // First pass: collect all declared local names
    const declRegex = /\blocal\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\s*,\s*[a-zA-Z_][a-zA-Z0-9_]*)*)/g;
    let m;
    while ((m = declRegex.exec(src)) !== null) {
        const names = m[1].split(',').map(s => s.trim());
        for (const name of names) {
            if (!nameMap.has(name) && !LUAU_KEYWORDS.has(name)) {
                nameMap.set(name, randVarUnique(usedNewNames, 5 + (idx++ % 5)));
            }
        }
    }

    // Also pick up function parameter names
    const funcRegex = /function\s*[^(]*\(([^)]*)\)/g;
    while ((m = funcRegex.exec(src)) !== null) {
        const params = m[1].split(',').map(s => s.trim()).filter(Boolean);
        for (const p of params) {
            const clean = p.replace(/^\.\.\./, '').trim();
            if (clean && !nameMap.has(clean) && !LUAU_KEYWORDS.has(clean)) {
                nameMap.set(clean, randVarUnique(usedNewNames, 5 + (idx++ % 5)));
            }
        }
    }

    // Second pass: replace all occurrences
    let out = src;
    // Sort by length descending to avoid partial-name replacement
    const sorted = [...nameMap.entries()].sort((a, b) => b[0].length - a[0].length);
    for (const [oldName, newName] of sorted) {
        out = out.replace(new RegExp(`\\b${oldName}\\b`, 'g'), newName);
    }

    return out;
}

// ── Pass 8: Control flow flattening ───────────────────────────────────────
// Breaks the script into numbered chunks dispatched by a state machine
// This is a simplified version — full CFG flattening requires an AST
function passFlattenFlow(src) {
    // True flattening requires an AST. The previous chunk-based logic
    // broke multi-line tables. We provide a safe wrapper Instead.
    const stateVar = randVar(5);
    const junkVar = randVar(5);
    return `local ${stateVar}=true\nif ${stateVar} then\n  local ${junkVar}=1\n  while ${junkVar}<2 do\n`
        + src.split('\n').map(l => '    ' + l).join('\n')
        + `\n    ${junkVar}=${junkVar}+1\n  end\nend`;
}

// ── Pass 9: Garbage / dead code injection ──────────────────────────────────
// Injects realistic-looking but unreachable or no-op Luau code
function passInjectGarbage(src) {
    const noops = [
        () => `local ${randVar(4)}=nil`,
        () => `if (not (not (not false))) then local ${randVar(3)}=0 end`,
        () => `pcall(function() local ${randVar(4)}=type(nil) end)`,
        () => `local ${randVar(4)}=tostring(0x${randHex(4)})`,
        () => `do local ${randVar(4)}=math.floor(0) end`,
        () => `local ${randVar(4)}=nil`,
        () => `if false then error("${randHex(8)}") end`,
        () => `local ${randVar(4)}=(1-1)`,
        () => `coroutine.wrap(function()end)()`,
        () => `local ${randVar(4)}={["${randHex(4)}"]=0x${randHex(3)}}`,
    ];

    const lines = src.split('\n');
    const result = [];
    let braceDepth = 0;

    lines.forEach((line) => {
        const ob = (line.match(/[\{\(\[]/g) || []).length;
        const cb = (line.match(/[\}\)\]]/g) || []).length;
        const prevDepth = braceDepth;
        braceDepth += Number(ob) - Number(cb);

        // Safely inject only when we are NOT inside a table, parenthesis, or bracket
        if (prevDepth === 0 && line.trim().length > 4) {
            const t = line.trim();
            // Heuristic: line looks like a safe statement boundary
            if (t.match(/^(local|if|while|for|return|print|warn|pcall|coroutine\.|do\b|end\b)/)) {
                if (Math.random() < 0.3) {
                    result.push(noops[randInt(0, noops.length)]());
                }
            }
        }
        result.push(line);
    });
    return result.join('\n');
}

// ── Pass 10: Dead code injection ───────────────────────────────────────────
// Adds entire fake functions that are defined but never called
function passDeadCode(src) {
    const count = randInt(2, 5);
    const fakes = [];
    for (let i = 0; i < count; i++) {
        const fnName = randVar(6);
        const paramA = randVar(3), paramB = randVar(3);
        const innerVar = randVar(4);
        fakes.push(
            `local function ${fnName}(${paramA},${paramB})\n`
            + `  local ${innerVar}=tostring(${paramA}).."${randHex(4)}"\n`
            + `  if type(${paramB})=="number" then\n`
            + `    return math.floor(${paramB}*0x${randHex(2)})\n`
            + `  end\n`
            + `  return ${innerVar}\n`
            + `end`
        );
    }
    return fakes.join('\n') + '\n' + src;
}

// ── Pass 11: Identifier shuffle (global access obfuscation) ───────────────
// Replaces common global service calls with table-lookup equivalents
// e.g. game:GetService("Players") → game:GetService(("\80\108\97\121\101\114\115"))
function passShuffleIdentifiers(src) {
    const services = ['Players', 'RunService', 'UserInputService', 'ReplicatedStorage',
        'TweenService', 'HttpService', 'DataStoreService', 'Workspace'];
    for (const svc of services) {
        const encoded = Array.from(svc).map(c => `\\${c.charCodeAt(0)}`).join('');
        // Only replace when inside GetService("...")
        src = src.replace(
            new RegExp(`GetService\\(["']${svc}["']\\)`, 'g'),
            `GetService("${encoded}")`
        );
    }
    return src;
}

// ── Pass 12: Base64 wrap ───────────────────────────────────────────────────
// Encodes the entire script as base64 and emits a self-decoding stub
// The stub uses a pure-Luau base64 decoder (no HttpGet required)
function passBase64Wrap(src) {
    const escapedPayload = toByteEscapePayload(src);
    const used = new Set();
    const payloadVar = randVarUnique(used, 5);
    const loaderVar = randVarUnique(used, 4);
    const fnVar = randVarUnique(used, 4);
    const errVar = randVarUnique(used, 4);
    const okVar = randVarUnique(used, 3);
    const runErrVar = randVarUnique(used, 5);

    return (
        `-- HYPR LAB | Byte-Escaped Payload
local ${payloadVar}="${escapedPayload}"
local ${loaderVar}=loadstring or load
if type(${loaderVar})~="function" then
  error("[HYPR] Decode failed: loader unavailable")
end
local ${fnVar},${errVar}=${loaderVar}(${payloadVar})
if ${fnVar} then
  local ${okVar},${runErrVar}=pcall(${fnVar})
  if not ${okVar} then error(${runErrVar}) end
else
  error("[HYPR] Decode failed: "..tostring(${errVar}))
end`
    );
}

// ── Orchestrator ───────────────────────────────────────────────────────────

function updateSize() {
    const v = document.getElementById('input-code').value;
    document.getElementById('in-size').textContent = v.length + ' chars';
}

function applyPass(src, passIndex, totalPasses) {
    let out = src;
    const first = passIndex === 0;
    const last = passIndex === totalPasses - 1;

    // Multi-pass hardening:
    // Run text/lexical transforms once to avoid re-obfuscating generated payload code.
    if (first) {
        if (getOpt('comments')) out = passStripComments(out);
        if (getOpt('whitespace')) out = passMinify(out);
        if (getOpt('booleans')) out = passBoolObf(out);
        if (getOpt('strings')) out = passStringEncode(out);
        if (getOpt('numbers')) out = passNumberEncode(out);
        if (getOpt('constants')) out = passConstantFold(out);
        if (getOpt('identifiers')) out = passShuffleIdentifiers(out);
        if (getOpt('rename')) out = passRenameVars(out);
    }

    // Structural/additive transforms run once at the end.
    if (last) {
        if (getOpt('deadcode')) out = passDeadCode(out);
        if (getOpt('garbage')) out = passInjectGarbage(out);
        if (getOpt('flow')) out = passFlattenFlow(out);
    }

    return out;
}

function obfuscate() {
    const src = document.getElementById('input-code').value.trim();
    if (!src) { alert('Paste a script first.'); return; }

    const passes = getOpt('multipass') ? 3 : 1;
    let out = src;

    // Run passes (b64 is always last — only once regardless of multipass)
    for (let p = 0; p < passes; p++) {
        out = applyPass(out, p, passes);
    }

    // Base64 wrap is a one-shot final layer
    if (getOpt('b64')) out = passBase64Wrap(out);

    // Header (only when not b64 wrapped — b64 has its own)
    if (!getOpt('b64')) {
        out = `--// HYPR LAB Obfuscator v3.0 — ${new Date().toISOString().slice(0, 10)}\n--// Passes: ${passes} | DO NOT DECOMPILE\n\n` + out;
    }

    // Update UI
    document.getElementById('output-code').value = out;
    document.getElementById('stat-in').textContent = src.length + ' b';
    document.getElementById('stat-out').textContent = out.length + ' b';
    const ratio = ((out.length / src.length - 1) * 100).toFixed(0);
    document.getElementById('stat-bloat').textContent = `+${ratio}%`;
    const activeCount = document.querySelectorAll('.obf-option.checked').length;
    document.getElementById('stat-passes').textContent = `${passes} × ${activeCount} opts`;
}
