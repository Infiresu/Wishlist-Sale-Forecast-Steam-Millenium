--[[
    Steam requests: resolve wishlist owner, read wishlist, read release/free status.
    Everything works without a Steam Web API key for public profiles;
    the key (if the user set one) is only a fallback.
]]

local http = require("http")
local json = require("json")
local logger = require("logger")
local util = require("wsf_util")

local M = {}

M._http = http -- replaceable in tests
local TIMEOUT = 15
local UA = "WishlistSaleForecast/1.0 (Millennium plugin)"

local function get(url)
    local res, err = M._http.get(url, { timeout = TIMEOUT, user_agent = UA })
    if not res then return nil, "network: " .. tostring(err) end
    return res
end

local function get_json(url)
    local res, err = get(url)
    if not res then return nil, err end
    if res.status ~= 200 then return nil, "HTTP " .. tostring(res.status), res.status end
    local ok, data = pcall(json.decode, res.body)
    if not ok or type(data) ~= "table" then return nil, "bad JSON" end
    return data
end

-- owner_type: "profiles" (owner = SteamID64) or "id" (owner = vanity name)
-- Returns steamid64 string or nil, error_code
function M.resolve_owner(owner_type, owner, steam_key)
    owner = tostring(owner or "")
    if owner_type == "profiles" then
        if owner:match("^%d+$") and #owner >= 16 then return owner end
        return nil, "BAD_OWNER"
    end
    if owner_type ~= "id" or not owner:match("^[%w_%-%.]+$") then
        return nil, "BAD_OWNER"
    end

    -- 1) Keyless: community profile XML contains <steamID64>
    local res = get("https://steamcommunity.com/id/" .. util.urlencode(owner) .. "/?xml=1")
    if res and res.status == 200 and type(res.body) == "string" then
        local id = res.body:match("<steamID64>%s*(%d+)%s*</steamID64>")
        if id then return id end
    end

    -- 2) Fallback: ResolveVanityURL (needs key)
    if steam_key and steam_key ~= "" then
        local data = get_json("https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/?key="
            .. util.urlencode(steam_key) .. "&vanityurl=" .. util.urlencode(owner))
        local r = data and data.response
        if r and r.success == 1 and r.steamid then return tostring(r.steamid) end
    end

    logger:info("[WSF] could not resolve vanity " .. owner)
    return nil, "OWNER_NOT_FOUND"
end

-- Returns list of appids in the owner's priority order, or nil, error_code
function M.get_wishlist(steamid, steam_key)
    local base = "https://api.steampowered.com/IWishlistService/GetWishlist/v1/?steamid=" .. util.urlencode(steamid)

    local data, err, status = get_json(base)
    if (not data) and steam_key and steam_key ~= "" then
        data, err, status = get_json(base .. "&key=" .. util.urlencode(steam_key))
    end
    if not data then
        logger:error("[WSF] GetWishlist failed: " .. tostring(err))
        if status == 401 or status == 403 then return nil, "WISHLIST_PRIVATE" end
        return nil, "STEAM_UNAVAILABLE"
    end

    local items = data.response and data.response.items
    if type(items) ~= "table" or next(items) == nil then
        -- Steam answers an empty response both for private and for empty wishlists
        return nil, "WISHLIST_EMPTY_OR_PRIVATE"
    end

    local list = {}
    for _, it in ipairs(items) do
        if it.appid then
            table.insert(list, { appid = tonumber(it.appid), priority = tonumber(it.priority) or 0 })
        end
    end
    table.sort(list, function(a, b)
        -- priority 0 means "not ranked"; Steam shows those after ranked ones
        local pa = a.priority == 0 and math.huge or a.priority
        local pb = b.priority == 0 and math.huge or b.priority
        return pa < pb
    end)

    local appids = {}
    for _, it in ipairs(list) do table.insert(appids, it.appid) end
    return appids
end

-- Store metadata (name, coming soon, free) for many apps.
-- Returns map appid -> { name, coming_soon, is_free }. Missing apps are simply absent.
function M.get_items(appids, country)
    local out = {}
    local CHUNK = 100
    for i = 1, #appids, CHUNK do
        local ids = {}
        for j = i, math.min(i + CHUNK - 1, #appids) do
            table.insert(ids, { appid = appids[j] })
        end
        local input = json.encode({
            ids = ids,
            context = { language = "english", country_code = country, steam_realm = 1 },
            data_request = { include_release = true },
        })
        local data, err = get_json("https://api.steampowered.com/IStoreBrowseService/GetItems/v1/?input_json="
            .. util.urlencode(input))
        if not data then
            logger:error("[WSF] GetItems failed: " .. tostring(err))
        else
            local items = data.response and data.response.store_items
            for _, it in ipairs(util.as_list(items)) do
                local appid = tonumber(it.appid or it.id)
                if appid then
                    local rel = type(it.release) == "table" and it.release or {}
                    out[appid] = {
                        name = it.name,
                        coming_soon = rel.is_coming_soon == true,
                        is_free = it.is_free == true,
                        visible = it.success == nil or it.success == 1,
                    }
                end
            end
        end
    end
    return out
end

return M
