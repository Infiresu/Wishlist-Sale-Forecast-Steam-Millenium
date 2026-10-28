--[[
    Plugin settings, stored as settings.json in the plugin folder.
    Keys are never written to the log.
]]

local millennium = require("millennium")
local util = require("wsf_util")

local M = {}

M.DEFAULTS = {
    itadKey = "",
    steamKey = "",      -- optional: only used if keyless Steam requests fail
    panelCollapsed = false,
    priceCountry = "",  -- "" = same region as the Steam store shown to the viewer
}

local function path()
    return millennium.get_install_path() .. "/settings.json"
end

function M.merge(s)
    local out = {}
    for k, v in pairs(M.DEFAULTS) do
        if type(s) == "table" and s[k] ~= nil and type(s[k]) == type(v) then
            out[k] = s[k]
        else
            out[k] = v
        end
    end
    out.itadKey = util.trim(out.itadKey)
    out.steamKey = util.trim(out.steamKey)
    return out
end

function M.load()
    return M.merge(util.read_json(path()) or {})
end

function M.save(s)
    return util.write_json(path(), M.merge(s))
end

-- What the UI is allowed to see: never send the keys themselves back to web pages
function M.public_view(s)
    return {
        hasItadKey = s.itadKey ~= "",
        hasSteamKey = s.steamKey ~= "",
        panelCollapsed = s.panelCollapsed,
        priceCountry = s.priceCountry,
    }
end

return M
