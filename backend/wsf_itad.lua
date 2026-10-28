--[[
    IsThereAnyDeal API v2 (https://docs.isthereanydeal.com/)
    The key is sent in the ITAD-API-Key header, not in the URL.
    Limits: about 1000 requests per 5 minutes per key; 429 carries Retry-After.
]]

local http = require("http")
local json = require("json")
local logger = require("logger")
local util = require("wsf_util")

local M = {}

M._http = http -- replaceable in tests
M.BASE = "https://api.isthereanydeal.com"
M.STEAM_SHOP_ID = 61
local TIMEOUT = 20

-- Returns decoded JSON, or nil + error table { code, retry_after }
local function request(method, path, key, body)
    local opts = {
        method = method,
        timeout = TIMEOUT,
        headers = { ["ITAD-API-Key"] = key, ["Accept"] = "application/json" },
        user_agent = "WishlistSaleForecast/1.0 (Millennium plugin)",
    }
    if body then
        opts.data = body
        opts.headers["Content-Type"] = "application/json"
    end

    local res, err = M._http.request(M.BASE .. path, opts)
    if not res then
        return nil, { code = "ITAD_UNAVAILABLE", detail = tostring(err) }
    end
    if res.status == 429 then
        local ra = tonumber(util.header(res.headers, "Retry-After")) or 30
        return nil, { code = "RATE_LIMITED", retry_after = ra }
    end
    if res.status == 401 or res.status == 403 then
        return nil, { code = "BAD_KEY" }
    end
    if res.status ~= 200 then
        logger:error("[WSF] ITAD " .. path:match("^[^?]*") .. " -> HTTP " .. tostring(res.status))
        return nil, { code = "ITAD_ERROR", detail = "HTTP " .. tostring(res.status) }
    end
    local ok, data = pcall(json.decode, res.body)
    if not ok or type(data) ~= "table" then
        return nil, { code = "ITAD_ERROR", detail = "bad JSON" }
    end
    return data
end

-- Cheap authenticated call used to check a key. Returns true, or nil + error table
function M.check_key(key)
    local data, err = request("GET", "/service/shops/v1", key)
    if not data then return nil, err end
    return true
end

-- Map Steam appids to ITAD game ids. Returns map appid -> gid|false, or nil, err
function M.lookup_appids(appids, key)
    local out = {}
    local CHUNK = 200
    for i = 1, #appids, CHUNK do
        local body = {}
        for j = i, math.min(i + CHUNK - 1, #appids) do
            table.insert(body, "app/" .. tostring(appids[j]))
        end
        local data, err = request("POST", "/lookup/id/shop/" .. M.STEAM_SHOP_ID .. "/v1", key, json.encode(body))
        if not data then return nil, err end
        for k, v in pairs(data) do
            local appid = tonumber(tostring(k):match("^app/(%d+)$"))
            if appid then
                out[appid] = (type(v) == "string" and v ~= "") and v or false
            end
        end
    end
    return out
end

-- Steam price history in the given country since `since_ts`.
-- Returns list of { ts, price, regular, cut, currency } sorted oldest first, or nil, err
function M.history(gid, country, since_ts, key)
    local path = "/games/history/v2?id=" .. util.urlencode(gid)
        .. "&country=" .. util.urlencode(country)
        .. "&shops=" .. M.STEAM_SHOP_ID
        .. "&since=" .. util.urlencode(util.iso_utc(since_ts))
    local data, err = request("GET", path, key)
    if not data then return nil, err end

    -- the spec says a plain array; the live API has also been seen wrapped as { value = [...] }
    local list = data
    if type(data.value) == "table" then list = data.value end

    local out = {}
    for _, e in ipairs(util.as_list(list)) do
        local deal = type(e) == "table" and e.deal
        local shop = type(e) == "table" and e.shop
        if type(deal) == "table" and type(deal.price) == "table"
            and (not shop or shop.id == nil or shop.id == M.STEAM_SHOP_ID) then
            local ts = util.parse_iso(e.timestamp)
            if ts then
                table.insert(out, {
                    ts = ts,
                    price = tonumber(deal.price.amount) or 0,
                    regular = type(deal.regular) == "table" and tonumber(deal.regular.amount) or nil,
                    cut = tonumber(deal.cut) or 0,
                    currency = deal.price.currency,
                })
            end
        end
    end
    table.sort(out, function(a, b) return a.ts < b.ts end)
    return out
end

return M
