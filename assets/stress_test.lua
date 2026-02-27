-- Advanced Luau stress script for obfuscation/runtime validation
local seed = 1337
local function rng()
    seed = (seed * 1103515245 + 12345) % 2147483648
    return seed
end

local function deepClone(value, seen)
    if type(value) ~= "table" then
        return value
    end
    seen = seen or {}
    if seen[value] then
        return seen[value]
    end
    local out = {}
    seen[value] = out
    for k, v in pairs(value) do
        out[deepClone(k, seen)] = deepClone(v, seen)
    end
    return setmetatable(out, getmetatable(value))
end

local stats = {
    total = 0,
    flags = { ok = true, warn = false },
    names = { "alpha", "beta", "gamma", "delta" },
}

local vectorMeta = {}
vectorMeta.__index = vectorMeta
vectorMeta.__add = function(a, b)
    return setmetatable({ x = a.x + b.x, y = a.y + b.y }, vectorMeta)
end
vectorMeta.__mul = function(a, s)
    return setmetatable({ x = a.x * s, y = a.y * s }, vectorMeta)
end
vectorMeta.__tostring = function(v)
    return string.format("V(%.2f, %.2f)", v.x, v.y)
end

local function vec(x, y)
    return setmetatable({ x = x, y = y }, vectorMeta)
end

local history = {}
local sum = 0
for i = 1, 20 do
    local n = (rng() % 97) + i
    local w = ((i % 4) + 1) / 3
    local value = math.floor((n * w) - (i / 2))
    history[#history + 1] = value
    sum = sum + value
end

table.sort(history, function(a, b)
    if (a % 7) == (b % 7) then
        return a < b
    end
    return (a % 7) < (b % 7)
end)

local function makeReducer(...)
    local factors = { ... }
    return function(values)
        local out = 0
        for i, v in ipairs(values) do
            local f = factors[((i - 1) % #factors) + 1]
            out = out + (v * f)
        end
        return out
    end
end

local reduce = makeReducer(1, -2, 3, -1, 2)
local weighted = reduce(history)

local acc = vec(0, 0)
for i = 1, #history do
    local h = history[i]
    acc = acc + (vec(i, h) * ((i % 3) + 1))
end

local function fragileDivide(a, b)
    if b == 0 then
        error("division by zero")
    end
    return a / b
end

local ok1, safeRatio = pcall(fragileDivide, weighted, sum)
local ok2, riskyRatio = pcall(fragileDivide, weighted, 0)

local trace = {}
local function errHandler(msg)
    trace[#trace + 1] = "handled:" .. tostring(msg)
    return "recover"
end
local ok3, xResult = xpcall(function()
    local t = {}
    return t.missing.value
end, errHandler)

local co = coroutine.create(function(limit)
    local i = 1
    local rolling = 0
    while i <= limit do
        rolling = rolling + ((history[i] or 0) * i)
        coroutine.yield(i, rolling, i % 2 == 0)
        i = i + 1
    end
    return rolling
end)

local coSnapshots = {}
repeat
    local ok, a, b, c = coroutine.resume(co, 8)
    if not ok then
        break
    end
    if coroutine.status(co) == "dead" then
        coSnapshots[#coSnapshots + 1] = { done = true, total = a }
        break
    else
        coSnapshots[#coSnapshots + 1] = { idx = a, val = b, even = c }
    end
until false

local data = deepClone({
    stats = stats,
    history = history,
    sum = sum,
    weighted = weighted,
    vector = tostring(acc),
    ratios = {
        safe = ok1 and safeRatio or -1,
        risky = ok2 and riskyRatio or math.huge,
    },
    xpcall = { ok = ok3, result = xResult, trace = trace },
    snapshots = coSnapshots,
})

local check = (data.sum > 0)
    and (data.weighted ~= 0)
    and (data.ratios.risky == math.huge)
    and (data.stats.flags.ok and not data.stats.flags.warn)
    and (string.find(data.vector, "V%(") ~= nil)

if check then
    local digest = 0
    for i, v in ipairs(data.history) do
        digest = (digest + (v * (i + 11))) % 1000003
    end

    local packed = string.format(
        "sum=%d weighted=%d safe=%.5f digest=%d co=%d",
        data.sum,
        data.weighted,
        data.ratios.safe,
        digest,
        #data.snapshots
    )

    if task and task.wait then
        task.wait(0.05)
    end
    print("[stress]", packed, data.vector, data.xpcall.result)
else
    warn("[stress] failed invariant")
end
