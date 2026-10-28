--[[
    Wishlist Sale Forecast - shared helpers
]]

local json = require("json")
local logger = require("logger")

local M = {}

-- Percent-encode a string for use in a URL query component
function M.urlencode(s)
    s = tostring(s)
    return (s:gsub("[^%w%-_%.~]", function(c)
        return string.format("%%%02X", string.byte(c))
    end))
end

-- Days since 1970-01-01 for a proleptic Gregorian date (Howard Hinnant's algorithm)
local function days_from_civil(y, m, d)
    if m <= 2 then y = y - 1 end
    local era = math.floor(y / 400)
    local yoe = y - era * 400
    local mp = (m + 9) % 12
    local doy = math.floor((153 * mp + 2) / 5) + d - 1
    local doe = yoe * 365 + math.floor(yoe / 4) - math.floor(yoe / 100) + doy
    return era * 146097 + doe - 719468
end

-- UTC epoch seconds from date parts (no dependence on the machine's timezone)
function M.utc_epoch(y, m, d, hh, mm, ss)
    return days_from_civil(y, m, d) * 86400 + (hh or 0) * 3600 + (mm or 0) * 60 + (ss or 0)
end

-- Parse ISO 8601 like "2022-12-27T11:21:08+01:00", "...Z" or "2026-12-17"
function M.parse_iso(str)
    if type(str) ~= "string" then return nil end
    local y, mo, d = str:match("^(%d%d%d%d)-(%d%d)-(%d%d)")
    if not y then return nil end
    local hh, mi, ss, rest = str:match("^%d+-%d+-%d+[T ](%d%d):(%d%d):?(%d*)(.*)$")
    local t = M.utc_epoch(tonumber(y), tonumber(mo), tonumber(d),
        tonumber(hh) or 0, tonumber(mi) or 0, tonumber(ss) or 0)
    if rest then
        rest = rest:gsub("^%.%d+", "")
        local sign, oh, om = rest:match("^([%+%-])(%d%d):?(%d%d)")
        if sign then
            local off = tonumber(oh) * 3600 + tonumber(om) * 60
            if sign == "+" then t = t - off else t = t + off end
        end
    end
    return t
end

-- Format epoch seconds as "YYYY-MM-DDTHH:MM:SSZ"
function M.iso_utc(t)
    return os.date("!%Y-%m-%dT%H:%M:%SZ", math.floor(t))
end

function M.now()
    return os.time()
end

function M.read_json(path)
    local f = io.open(path, "r")
    if not f then return nil end
    local content = f:read("*a")
    f:close()
    local ok, parsed = pcall(json.decode, content)
    if not ok or type(parsed) ~= "table" then return nil end
    return parsed
end

function M.write_json(path, data)
    local f, err = io.open(path, "w")
    if not f then
        logger:error("[WSF] cannot write " .. path .. ": " .. tostring(err))
        return false
    end
    f:write(json.encode(data))
    f:close()
    return true
end

-- Case-insensitive header lookup
function M.header(headers, name)
    if type(headers) ~= "table" then return nil end
    local lname = name:lower()
    for k, v in pairs(headers) do
        if type(k) == "string" and k:lower() == lname then return v end
    end
    return nil
end

function M.trim(s)
    if type(s) ~= "string" then return "" end
    return (s:gsub("^%s+", ""):gsub("%s+$", ""))
end

-- cjson turns JSON arrays into Lua sequences; this makes sure we got one
function M.as_list(v)
    if type(v) ~= "table" then return {} end
    return v
end

return M
