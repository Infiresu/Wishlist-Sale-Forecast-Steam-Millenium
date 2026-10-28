--[[
    Local-currency prices from the Steam store (no key needed).
    https://store.steampowered.com/api/appdetails?appids=<id>&cc=<country>&filters=price_overview
    Gives the current regular price in the viewer's region and currency, e.g. 1399 UAH for cc=ua.
    Steam keeps amounts in minor units (kopecks, cents), so 139900 means 1399.00.
]]

local http = require("http")
local json = require("json")
local logger = require("logger")
local util = require("wsf_util")

local M = {}

M._http = http -- replaceable in tests
local TIMEOUT = 15
local UA = "WishlistSaleForecast/1.0 (Millennium plugin)"

-- Returns { currency, regular } (regular in major units), or nil + error table { code, retry_after }
function M.regular_price(appid, country)
    local url = "https://store.steampowered.com/api/appdetails?appids=" .. util.urlencode(tostring(appid))
        .. "&cc=" .. util.urlencode(string.lower(country))
        .. "&filters=price_overview"
    local res, err = M._http.get(url, { timeout = TIMEOUT, user_agent = UA })
    if not res then return nil, { code = "STEAM_UNAVAILABLE", detail = tostring(err) } end
    if res.status == 429 then
        local ra = tonumber(util.header(res.headers, "Retry-After")) or 60
        return nil, { code = "RATE_LIMITED", retry_after = ra }
    end
    if res.status ~= 200 then
        logger:error("[WSF] appdetails " .. tostring(appid) .. " -> HTTP " .. tostring(res.status))
        return nil, { code = "STEAM_UNAVAILABLE", detail = "HTTP " .. tostring(res.status) }
    end

    local good, data = pcall(json.decode, res.body)
    if not good or type(data) ~= "table" then return nil, { code = "STEAM_UNAVAILABLE", detail = "bad JSON" } end

    local entry = data[tostring(appid)]
    local po = type(entry) == "table" and entry.success == true and type(entry.data) == "table"
        and entry.data.price_overview
    if type(po) ~= "table" or type(po.currency) ~= "string" then
        -- not sold in this region, or free
        return nil, { code = "NO_LOCAL_PRICE" }
    end

    local initial = tonumber(po.initial)
    if not initial or initial <= 0 then return nil, { code = "NO_LOCAL_PRICE" } end

    return { currency = po.currency, regular = initial / 100 }
end

return M
