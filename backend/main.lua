--[[
    Wishlist Sale Forecast - Millennium plugin backend (Lua)

    Exposed to frontend/webkit (each takes / returns a JSON string):
      WSF_GetWishlist(payload)   payload: { owner_type, owner, country }
      WSF_GetForecast(payload)   payload: { country, items = [{ gid, appid }] }
      WSF_GetSettings()          -> public view (never returns the keys)
      WSF_SaveSettings(payload)  payload: { itadKey?, steamKey?, panelCollapsed? }
      WSF_ClearCache()
]]

local logger = require("logger")
local millennium = require("millennium")
local json = require("json")

local util = require("wsf_util")
local sales = require("wsf_sales")
local settings = require("wsf_settings")
local cache = require("wsf_cache")
local steam = require("wsf_steam")
local itad = require("wsf_itad")
local steamprice = require("wsf_steamprice")
local forecast = require("wsf_forecast")

-- How many past seasonal sales we are willing to step back through
local MAX_LOOKBACK = 8
local GID_TTL_FOUND = 60 * 86400
local GID_TTL_MISSING = 3 * 86400
local FORECAST_TTL = 14 * 86400
local MAX_GIDS_PER_CALL = 12
local STEAM_PRICE_TTL = 86400

local function ok(data)
    data = data or {}
    data.success = true
    return json.encode(data)
end

local function fail(code, extra)
    local out = extra or {}
    out.success = false
    out.code = code
    return json.encode(out)
end

local function guarded(name, fn)
    return function(...)
        local good, result = pcall(fn, ...)
        if not good then
            logger:error("[WSF] " .. name .. " crashed: " .. tostring(result))
            return fail("INTERNAL", { detail = tostring(result) })
        end
        return result
    end
end

local function decode(payload)
    if type(payload) ~= "string" or payload == "" then return {} end
    local good, data = pcall(json.decode, payload)
    if good and type(data) == "table" then return data end
    return {}
end

local function normalize_country(c)
    c = tostring(c or ""):upper()
    if c:match("^%u%u$") then return c end
    return "US"
end

local function reference_sales(now)
    local ref = sales.reference(now)
    local out = {}
    for i = 1, math.min(#ref, MAX_LOOKBACK) do out[i] = ref[i] end
    return out
end

-- ---------------------------------------------------------------- wishlist

local function get_wishlist(payload)
    local p = decode(payload)
    local s = settings.load()
    if s.itadKey == "" then return fail("NO_KEY") end

    local country = normalize_country(p.country)

    local steamid, err = steam.resolve_owner(p.owner_type, p.owner, s.steamKey)
    if not steamid then return fail(err) end

    local appids, werr = steam.get_wishlist(steamid, s.steamKey)
    if not appids then return fail(werr) end

    -- appid -> ITAD game id, cached
    local gids, to_lookup = {}, {}
    for _, appid in ipairs(appids) do
        local v, found = cache.get("gid", tostring(appid))
        if found then gids[appid] = v else table.insert(to_lookup, appid) end
    end
    if #to_lookup > 0 then
        local looked, lerr = itad.lookup_appids(to_lookup, s.itadKey)
        if not looked then
            cache.flush()
            return fail(lerr.code, { retryAfter = lerr.retry_after })
        end
        for _, appid in ipairs(to_lookup) do
            local v = looked[appid] or false
            gids[appid] = v
            cache.set("gid", tostring(appid), v, v and GID_TTL_FOUND or GID_TTL_MISSING)
        end
        cache.flush()
    end

    local meta = steam.get_items(appids, country)

    local games = {}
    for _, appid in ipairs(appids) do
        local m = meta[appid] or {}
        table.insert(games, {
            appid = appid,
            name = m.name or ("App " .. appid),
            gid = gids[appid] or nil,
            unreleased = m.coming_soon == true,
            free = m.is_free == true,
        })
    end

    local now = util.now()
    local ref = reference_sales(now)
    local ref_public = {}
    for i, sale in ipairs(ref) do ref_public[i] = sales.public(sale) end

    return ok({
        steamid = steamid,
        country = country,
        games = games,
        nextSale = sales.public(sales.next(now)),
        currentSale = sales.public(sales.current(now)),
        referenceSales = ref_public,
    })
end

-- ---------------------------------------------------------------- forecast

-- Steam regular price in the viewer's region, cached for a day
local function steam_regular(appid, country)
    local key = country .. "|" .. tostring(appid)
    local v, found = cache.get("sp", key)
    if found then return v end
    local lp, err = steamprice.regular_price(appid, country)
    if lp then cache.set("sp", key, lp, STEAM_PRICE_TTL) end
    return lp, err
end

local function round2(x)
    return math.floor(x * 100 + 0.5) / 100
end

-- payload: { country, items = [{ gid, appid }] }
-- Discount % and sale dates come from ITAD; the price itself is the Steam regular price
-- in the viewer's region minus that discount, so the amounts are in the local currency.
local function get_forecast(payload)
    local p = decode(payload)
    local s = settings.load()
    if s.itadKey == "" then return fail("NO_KEY") end

    local country = normalize_country(p.country)
    local items = util.as_list(p.items)
    if #items > MAX_GIDS_PER_CALL then return fail("TOO_MANY") end

    local now = util.now()
    local ref = reference_sales(now)
    if #ref == 0 then return fail("NO_SALES") end

    local signature = sales.reference_signature(now)
    local since = ref[#ref].start_ts - 30 * 86400

    local results = {}
    local rejected = 0
    for _, item in ipairs(items) do
        local gid = type(item) == "table" and item.gid
        local appid = type(item) == "table" and tonumber(item.appid)
        if not (type(gid) == "string" and gid:match("^[%x%-]+$") and appid and appid > 0 and appid == math.floor(appid)) then
            rejected = rejected + 1
        else
            -- 1) Steam first: no regional price means no ITAD request at all (Steam has its own limit, cached)
            local lp, lerr = steam_regular(appid, country)
            if not lp then
                if lerr and lerr.code == "RATE_LIMITED" then
                    cache.flush()
                    return fail("RATE_LIMITED", { retryAfter = lerr.retry_after, results = results })
                elseif lerr and lerr.code == "NO_LOCAL_PRICE" then
                    -- Steam shows no price for this region (not sold there, or free)
                    results[gid] = { status = "nolocal" }
                else
                    results[gid] = { status = "error" }
                end
            else
                -- 2) ITAD only for games that have a regional price
                local key = gid .. "|" .. country .. "|" .. signature
                local disc, found = cache.get("fc", key)
                local itad_err = nil
                if not found then
                    local entries, err = itad.history(gid, country, since, s.itadKey)
                    if entries then
                        disc = forecast.compute(entries, ref)
                        cache.set("fc", key, disc, FORECAST_TTL)
                    else
                        itad_err = err
                    end
                end

                if itad_err then
                    cache.flush()
                    if itad_err.code == "RATE_LIMITED" or itad_err.code == "BAD_KEY" then
                        -- hand back what we already have; the UI retries the rest
                        return fail(itad_err.code, { retryAfter = itad_err.retry_after, results = results })
                    end
                    results[gid] = { status = "error" }
                elseif disc.status ~= "ok" then
                    results[gid] = disc
                else
                    results[gid] = {
                        status = "ok",
                        sale_id = disc.sale_id,
                        cut = disc.cut,
                        regular = lp.regular,
                        price = round2(lp.regular * (1 - disc.cut / 100)),
                        currency = lp.currency,
                    }
                end
            end
        end
    end
    cache.flush()
    -- counts only, never the keys or game names
    logger:info(string.format("[WSF] forecast country=%s items=%d results=%d rejected=%d",
        country, #items, (function() local n = 0 for _ in pairs(results) do n = n + 1 end return n end)(), rejected))
    return ok({ results = results })
end

-- ---------------------------------------------------------------- settings

local function get_settings()
    return ok({ data = settings.public_view(settings.load()) })
end

local function save_settings(payload)
    local p = decode(payload)
    local s = settings.load()
    if type(p.itadKey) == "string" then s.itadKey = util.trim(p.itadKey) end
    if type(p.steamKey) == "string" then s.steamKey = util.trim(p.steamKey) end
    if type(p.panelCollapsed) == "boolean" then s.panelCollapsed = p.panelCollapsed end
    if type(p.priceCountry) == "string" then
        local c = util.trim(p.priceCountry):upper()
        if c == "" or c:match("^%u%u$") then s.priceCountry = c end
    end
    if not settings.save(s) then return fail("WRITE_FAILED") end
    -- log presence only, never the key itself
    logger:info("[WSF] settings saved (ITAD key " .. (s.itadKey ~= "" and "set" or "empty")
        .. ", Steam key " .. (s.steamKey ~= "" and "set" or "empty") .. ")")
    return ok({ data = settings.public_view(settings.load()) })
end

-- Checks the saved key, or a key typed into the form but not saved yet
local function test_key(payload)
    local p = decode(payload)
    local key = util.trim(p.itadKey)
    if key == "" then key = settings.load().itadKey end
    if key == "" then return fail("NO_KEY") end

    local valid, err = itad.check_key(key)
    if not valid then return fail(err.code, { retryAfter = err.retry_after }) end
    return ok({ valid = true })
end

local function clear_cache()
    cache.clear()
    return ok({ stats = cache.stats() })
end

WSF_GetWishlist = guarded("GetWishlist", get_wishlist)
WSF_GetForecast = guarded("GetForecast", get_forecast)
WSF_GetSettings = guarded("GetSettings", get_settings)
WSF_SaveSettings = guarded("SaveSettings", save_settings)
WSF_TestKey = guarded("TestKey", test_key)
WSF_ClearCache = guarded("ClearCache", clear_cache)

-- ---------------------------------------------------------------- lifecycle

local function on_load()
    logger:info("[WSF] Wishlist Sale Forecast loaded, Millennium " .. tostring(millennium.version()))
    cache.load()
    millennium.ready()
end

local function on_frontend_loaded()
end

local function on_unload()
    cache.flush()
    logger:info("[WSF] unloaded")
end

return {
    on_load = on_load,
    on_frontend_loaded = on_frontend_loaded,
    on_unload = on_unload,
    WSF_GetWishlist = WSF_GetWishlist,
    WSF_GetForecast = WSF_GetForecast,
    WSF_GetSettings = WSF_GetSettings,
    WSF_SaveSettings = WSF_SaveSettings,
    WSF_TestKey = WSF_TestKey,
    WSF_ClearCache = WSF_ClearCache,
}
