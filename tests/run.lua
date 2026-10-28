--[[
    Offline tests for the Lua backend (no Steam, no network).
    Run from the plugin root:   luajit tests/run.lua
    Needs lua-cjson installed (the same JSON library Millennium ships as "json").
]]

package.path = "./backend/?.lua;" .. package.path

local cjson = require("cjson")
local tmpdir = os.getenv("TMPDIR") or "/tmp"

-- ---------------------------------------------------------------- Millennium stubs
package.loaded["json"] = cjson
package.loaded["logger"] = {
    info = function() end,
    error = function(_, m) io.stderr:write("  [log] " .. tostring(m) .. "\n") end,
}
package.loaded["millennium"] = {
    get_install_path = function() return tmpdir end,
    ready = function() end,
    version = function() return "test" end,
}

-- Fake HTTP: routes are { pattern, handler(url, opts) -> response }
local routes = {}
local calls = {}
local function fake_request(url, opts)
    table.insert(calls, { url = url, opts = opts or {} })
    for _, r in ipairs(routes) do
        if url:find(r[1]) then return r[2](url, opts or {}) end
    end
    return nil, "no route for " .. url
end
package.loaded["http"] = {
    request = fake_request,
    get = function(url, opts) return fake_request(url, opts) end,
}

local util = require("wsf_util")
local sales = require("wsf_sales")
local forecast = require("wsf_forecast")

-- ---------------------------------------------------------------- tiny test harness
local passed, failed = 0, 0
local function check(name, cond, detail)
    if cond then
        passed = passed + 1
        print("  ok   " .. name)
    else
        failed = failed + 1
        print("  FAIL " .. name .. (detail and ("  -> " .. tostring(detail)) or ""))
    end
end

local function sale(id)
    for _, s in ipairs(sales.ALL) do if s.id == id then return s end end
    error("no sale " .. id)
end

local function ts(iso) return util.parse_iso(iso) end

-- ---------------------------------------------------------------- util
print("util")
check("parse Z", ts("1970-01-02T00:00:00Z") == 86400)
check("parse +01:00", ts("2022-12-27T11:21:08+01:00") == ts("2022-12-27T10:21:08Z"))
check("parse -07:00", ts("2026-10-01T10:00:00-07:00") == ts("2026-10-01T17:00:00Z"))
check("parse fraction", ts("2026-10-01T17:00:00.123Z") == ts("2026-10-01T17:00:00Z"))
check("parse date only", ts("2026-12-17") == ts("2026-12-17T00:00:00Z"))
check("iso roundtrip", util.iso_utc(ts("2025-06-26T17:00:00Z")) == "2025-06-26T17:00:00Z")
check("urlencode", util.urlencode("a b:/?é") == "a%20b%3A%2F%3F%C3%A9")

-- ---------------------------------------------------------------- sales calendar
print("sales calendar")
local NOW = ts("2026-10-28T00:00:00Z")
check("next sale is winter-2026", sales.next(NOW).id == "winter-2026")
check("no sale running on Oct 28", sales.current(NOW) == nil)
check("latest reference is autumn-2026", sales.reference(NOW)[1].id == "autumn-2026")
check("second reference is summer-2026", sales.reference(NOW)[2].id == "summer-2026")
check("running during autumn sale", sales.current(ts("2026-10-03T00:00:00Z")).id == "autumn-2026")
check("winter starts 17:00 UTC", sale("winter-2026").start_ts == ts("2026-12-17T17:00:00Z"))

-- ---------------------------------------------------------------- forecast rule
print("forecast rule")
local ref = sales.reference(NOW)

local function e(iso, price, cut, regular)
    return { ts = ts(iso), price = price, cut = cut, regular = regular or 1000, currency = "UAH" }
end

-- discounted in autumn 2026 (and deeper in summer): latest sale wins
local h1 = {
    e("2026-01-01T00:00:00Z", 1000, 0),
    e("2026-06-25T17:10:00Z", 400, 60), e("2026-07-09T17:05:00Z", 1000, 0),
    e("2026-10-01T17:08:00Z", 500, 50), e("2026-10-08T17:03:00Z", 1000, 0),
}
local r1 = forecast.compute(h1, ref)
check("latest sale used", r1.status == "ok" and r1.sale_id == "autumn-2026" and r1.price == 500, cjson.encode(r1))

-- not discounted in autumn: step back to summer
local h2 = {
    e("2026-01-01T00:00:00Z", 1000, 0),
    e("2026-06-25T17:10:00Z", 400, 60), e("2026-07-09T17:05:00Z", 1000, 0),
}
local r2 = forecast.compute(h2, ref)
check("steps back to summer", r2.status == "ok" and r2.sale_id == "summer-2026" and r2.price == 400, cjson.encode(r2))

-- publisher discount that ends exactly as the sale starts does not count
local h3 = {
    e("2026-09-24T17:00:00Z", 300, 70), e("2026-10-01T17:01:00Z", 1000, 0),
}
local r3 = forecast.compute(h3, { sale("autumn-2026") })
check("pre-sale discount ignored", r3.status == "nodiscount", cjson.encode(r3))

-- discount that started before the sale and runs through it does count
local h4 = {
    e("2026-09-28T17:00:00Z", 700, 30), e("2026-10-10T17:00:00Z", 1000, 0),
}
local r4 = forecast.compute(h4, { sale("autumn-2026") })
check("overlapping discount counted", r4.status == "ok" and r4.price == 700, cjson.encode(r4))

-- price dropped further mid-sale: lowest wins
local h5 = {
    e("2026-06-25T17:10:00Z", 600, 40), e("2026-07-01T10:00:00Z", 500, 50), e("2026-07-09T17:05:00Z", 1000, 0),
}
local r5 = forecast.compute(h5, { sale("summer-2026") })
check("lowest during sale", r5.price == 500, cjson.encode(r5))

check("empty history", forecast.compute({}, ref).status == "nodiscount")
check("never discounted", forecast.compute({ e("2025-01-01T00:00:00Z", 1000, 0) }, ref).status == "nodiscount")

-- ---------------------------------------------------------------- full backend flow with fake network
print("backend flow")
os.remove(tmpdir .. "/settings.json")
os.remove(tmpdir .. "/cache.json")

-- freeze "now"
util.now = function() return NOW end

local plugin = dofile("./backend/main.lua")
plugin.on_load()

local function call(fn, payload) return cjson.decode(fn(payload and cjson.encode(payload) or nil)) end

local r = call(plugin.WSF_GetWishlist, { owner_type = "id", owner = "Infiresu", country = "UA" })
check("no key -> NO_KEY", r.success == false and r.code == "NO_KEY")

r = call(plugin.WSF_SaveSettings, { itadKey = "  test-key  " })
check("save settings", r.success and r.data.hasItadKey == true and r.data.itadKey == nil, cjson.encode(r))
local raw_settings = util.read_json(tmpdir .. "/settings.json")
check("key trimmed on disk", raw_settings.itadKey == "test-key")

local function ok_json(body) return { status = 200, body = cjson.encode(body), headers = {} } end

routes = {
    { "steamcommunity%.com/id/Infiresu/%?xml=1", function()
        return { status = 200, body = "<profile><steamID64>76561198000000001</steamID64></profile>", headers = {} }
    end },
    { "IWishlistService/GetWishlist", function(url)
        assert(url:find("steamid=76561198000000001"), "wrong steamid in " .. url)
        return ok_json({ response = { items = {
            { appid = 30, priority = 0 }, { appid = 10, priority = 1 }, { appid = 20, priority = 2 },
            { appid = 40, priority = 3 }, { appid = 50, priority = 4 }, { appid = 60, priority = 5 },
        } } })
    end },
    { "lookup/id/shop/61/v1", function(_, opts)
        assert(opts.headers["ITAD-API-Key"] == "test-key", "key must be sent as header")
        local body = cjson.decode(opts.data)
        local out = {}
        for _, k in ipairs(body) do
            if k == "app/50" then out[k] = cjson.null else out[k] = "0000-" .. k:match("%d+") end
        end
        return ok_json(out)
    end },
    { "IStoreBrowseService/GetItems", function(url)
        assert(url:find("country_code"), "country must be passed")
        return ok_json({ response = { store_items = {
            { appid = 10, name = "Ten", success = 1, release = { is_coming_soon = false } },
            { appid = 20, name = "Twenty", success = 1, release = { is_coming_soon = false } },
            { appid = 30, name = "Thirty", success = 1, release = { is_coming_soon = false } },
            { appid = 40, name = "Forty (soon)", success = 1, release = { is_coming_soon = true } },
            { appid = 50, name = "Fifty", success = 1, release = {} },
            { appid = 60, name = "Sixty F2P", success = 1, is_free = true, release = {} },
        } } })
    end },
    { "games/history/v2", function(url, opts)
        assert(not url:find("test%-key"), "key must not be in URL")
        assert(url:find("country=UA") and url:find("shops=61"), "bad history query " .. url)
        local id = url:match("id=0000%-(%d+)")
        local hist = {
            ["10"] = { -- autumn-2026: 50% off
                { timestamp = "2026-10-08T19:03:00+02:00", shop = { id = 61 }, deal = { price = { amount = 200, currency = "UAH" }, regular = { amount = 200, currency = "UAH" }, cut = 0 } },
                { timestamp = "2026-10-01T19:08:00+02:00", shop = { id = 61 }, deal = { price = { amount = 100, currency = "UAH" }, regular = { amount = 200, currency = "UAH" }, cut = 50 } },
            },
            ["20"] = { -- only summer-2026: 75% off
                { timestamp = "2026-06-25T17:20:00Z", shop = { id = 61 }, deal = { price = { amount = 50, currency = "UAH" }, regular = { amount = 200, currency = "UAH" }, cut = 75 } },
                { timestamp = "2026-07-09T17:20:00Z", shop = { id = 61 }, deal = { price = { amount = 200, currency = "UAH" }, regular = { amount = 200, currency = "UAH" }, cut = 0 } },
            },
            ["30"] = {}, -- never discounted
            ["99"] = { -- discounted, but Steam has no price in this region
                { timestamp = "2026-10-01T19:08:00+02:00", shop = { id = 61 }, deal = { price = { amount = 100, currency = "USD" }, regular = { amount = 200, currency = "USD" }, cut = 50 } },
            },
        }
        return ok_json(hist[id] or {})
    end },
    { "store.steampowered.com/api/appdetails", function(url)
        assert(url:find("cc=ua") and url:find("filters=price_overview"), "bad appdetails query " .. url)
        local id = url:match("appids=(%d+)")
        if id == "99" then return ok_json({ ["99"] = { success = false } }) end
        -- 200.00 UAH regular price for every game
        return ok_json({ [id] = { success = true, data = { price_overview = {
            currency = "UAH", initial = 20000, final = 20000, discount_percent = 0,
        } } } })
    end },
}

r = call(plugin.WSF_GetWishlist, { owner_type = "id", owner = "Infiresu", country = "ua" })
check("wishlist ok", r.success, cjson.encode(r))
check("country normalized", r.country == "UA")
check("priority order kept, unranked last", r.games[1].appid == 10 and r.games[6].appid == 30, cjson.encode(r.games))
check("next sale reported", r.nextSale and r.nextSale.id == "winter-2026")
local by = {}
for _, g in ipairs(r.games) do by[g.appid] = g end
check("unreleased flagged", by[40].unreleased == true)
check("free flagged", by[60].free == true)
check("not on ITAD has no gid", by[50].gid == nil)
check("gid mapped", by[10].gid == "0000-10")

local function history_calls()
    local n = 0
    for _, c in ipairs(calls) do if c.url:find("games/history") then n = n + 1 end end
    return n
end
local ITEMS = { { gid = "0000-10", appid = 10 }, { gid = "0000-20", appid = 20 }, { gid = "0000-30", appid = 30 } }

calls = {}
r = call(plugin.WSF_GetForecast, { country = "UA", items = ITEMS })
check("forecast ok", r.success, cjson.encode(r))
check("game 10 from autumn", r.results["0000-10"].sale_id == "autumn-2026" and r.results["0000-10"].price == 100, cjson.encode(r.results["0000-10"]))
check("price is in local currency", r.results["0000-10"].currency == "UAH" and r.results["0000-10"].regular == 200, cjson.encode(r.results["0000-10"]))
check("game 20 stepped back to summer", r.results["0000-20"].sale_id == "summer-2026" and r.results["0000-20"].price == 50)
check("game 20 local price 200 x (1-75%)", r.results["0000-20"].price == 50)
check("game 30 no discount", r.results["0000-30"].status == "nodiscount")
check("3 history requests", history_calls() == 3)
local first_history
for _, c in ipairs(calls) do if c.url:find("games/history") then first_history = c; break end end
local since = first_history.url:match("since=([^&]+)")
check("history goes back several sales", since and since:find("2024"), since)

-- no Steam price in this region -> nolocal, not counted as a price
calls = {}
r = call(plugin.WSF_GetForecast, { country = "UA", items = { { gid = "0000-99", appid = 99 } } })
check("no local price -> nolocal", r.results["0000-99"].status == "nolocal", cjson.encode(r))
check("no local price -> no ITAD request", history_calls() == 0, #calls)

calls = {}
r = call(plugin.WSF_GetForecast, { country = "UA", items = ITEMS })
check("second call fully cached", r.success and #calls == 0, #calls)

-- rate limit returns partial results
plugin.WSF_ClearCache()
local n = 0
table.insert(routes, 1, { "games/history/v2", function()
    n = n + 1
    if n >= 2 then return { status = 429, body = "", headers = { ["retry-after"] = "42" } } end
    return ok_json({})
end })
r = call(plugin.WSF_GetForecast, { country = "UA", items = { { gid = "0000-10", appid = 10 }, { gid = "0000-20", appid = 20 } } })
check("429 -> RATE_LIMITED", r.success == false and r.code == "RATE_LIMITED" and r.retryAfter == 42, cjson.encode(r))
check("429 keeps finished results", r.results and r.results["0000-10"] ~= nil)
table.remove(routes, 1)

-- private wishlist
routes[2] = { "IWishlistService/GetWishlist", function() return ok_json({ response = {} }) end }
r = call(plugin.WSF_GetWishlist, { owner_type = "profiles", owner = "76561198000000002", country = "UA" })
check("private/empty wishlist", r.code == "WISHLIST_EMPTY_OR_PRIVATE", cjson.encode(r))

-- bad owner input never reaches the network
calls = {}
r = call(plugin.WSF_GetWishlist, { owner_type = "id", owner = "../evil?x=1", country = "UA" })
check("bad vanity rejected", r.code == "BAD_OWNER" and #calls == 0)

local many = {}
for i = 1, 13 do many[i] = { gid = "0000-" .. i, appid = i } end
check("too many items rejected", call(plugin.WSF_GetForecast, { country = "UA", items = many }).code == "TOO_MANY")

-- key test: typed key is used, key goes in header, bad key is reported
plugin.WSF_ClearCache()
calls = {}
routes = {
    { "service/shops/v1", function(_, opts)
        if opts.headers["ITAD-API-Key"] == "good-key" then return ok_json({}) end
        return { status = 403, body = "", headers = {} }
    end },
}
r = call(plugin.WSF_TestKey, { itadKey = "good-key" })
check("typed good key accepted", r.success and r.valid == true, cjson.encode(r))
r = call(plugin.WSF_TestKey, { itadKey = "bad-key" })
check("bad key -> BAD_KEY", r.success == false and r.code == "BAD_KEY", cjson.encode(r))

-- saved key is used when nothing is typed
call(plugin.WSF_SaveSettings, { itadKey = "good-key" })
r = call(plugin.WSF_TestKey, {})
check("saved key tested when form empty", r.success == true)

-- empty save is a valid "remove" at backend level
call(plugin.WSF_SaveSettings, { itadKey = "" })
check("removing key clears it", call(plugin.WSF_GetSettings).data.hasItadKey == false)
check("test without any key -> NO_KEY", call(plugin.WSF_TestKey, {}).code == "NO_KEY")

-- price region setting
r = call(plugin.WSF_SaveSettings, { priceCountry = " ua " })
check("price country saved upper-case", r.data.priceCountry == "UA", cjson.encode(r))
call(plugin.WSF_SaveSettings, { priceCountry = "../x" })
check("invalid price country ignored", call(plugin.WSF_GetSettings).data.priceCountry == "UA")
call(plugin.WSF_SaveSettings, { priceCountry = "" })
check("price country can go back to auto", call(plugin.WSF_GetSettings).data.priceCountry == "")

os.remove(tmpdir .. "/settings.json")
os.remove(tmpdir .. "/cache.json")

print(string.format("\n%d passed, %d failed", passed, failed))
os.exit(failed == 0 and 0 or 1)
