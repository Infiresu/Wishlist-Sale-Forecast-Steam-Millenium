--[[
    Small persistent key/value cache with per-entry expiry.
    Buckets: "gid" (Steam appid -> ITAD game id), "fc" (ITAD discount forecast per game+country),
    "sp" (Steam regular price per appid+country).
]]

local millennium = require("millennium")
local util = require("wsf_util")

local M = {}

local data = { gid = {}, fc = {}, sp = {} }
local dirty = 0
local MAX_PER_BUCKET = 5000

local function path()
    return millennium.get_install_path() .. "/cache.json"
end

function M.load()
    local d = util.read_json(path())
    if type(d) == "table" then
        data.gid = type(d.gid) == "table" and d.gid or {}
        data.fc = type(d.fc) == "table" and d.fc or {}
        data.sp = type(d.sp) == "table" and d.sp or {}
    end
    M.prune()
end

function M.flush()
    if dirty > 0 then
        util.write_json(path(), data)
        dirty = 0
    end
end

function M.prune()
    local now = util.now()
    for _, bucket in pairs(data) do
        local count = 0
        for k, e in pairs(bucket) do
            if type(e) ~= "table" or (e.exp or 0) < now then
                bucket[k] = nil
            else
                count = count + 1
            end
        end
        if count > MAX_PER_BUCKET then
            for k in pairs(bucket) do bucket[k] = nil end
        end
    end
end

-- Returns value, found
function M.get(bucket, key)
    local e = data[bucket] and data[bucket][key]
    if not e then return nil, false end
    if (e.exp or 0) < util.now() then
        data[bucket][key] = nil
        return nil, false
    end
    return e.v, true
end

function M.set(bucket, key, value, ttl)
    data[bucket][key] = { v = value, exp = util.now() + ttl }
    dirty = dirty + 1
end

function M.clear()
    data = { gid = {}, fc = {}, sp = {} }
    dirty = 1
    M.flush()
end

function M.stats()
    local out = {}
    for name, bucket in pairs(data) do
        local n = 0
        for _ in pairs(bucket) do n = n + 1 end
        out[name] = n
    end
    return out
end

return M
