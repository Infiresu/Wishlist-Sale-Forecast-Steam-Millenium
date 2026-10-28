--[[
    Steam seasonal sale calendar.

    Valve publishes the dates in advance. Every sale starts and ends at 10:00 Pacific,
    which is 17:00 UTC (PDT) or 18:00 UTC (PST); we store 17:00 UTC and the price
    logic samples a few hours inside the window, so the 1h difference never matters.

    To add a new sale: append an entry. Order does not matter.
    Sources: Valve / Steamworks announcements (2025-2027),
             2024 dates taken from press coverage of the same announcements.
]]

local util = require("wsf_util")

local M = {}

local RAW = {
    -- 2024
    { id = "spring-2024", season = "spring", year = 2024, start = "2024-03-14", finish = "2024-03-21" },
    { id = "summer-2024", season = "summer", year = 2024, start = "2024-06-27", finish = "2024-07-11" },
    { id = "autumn-2024", season = "autumn", year = 2024, start = "2024-11-27", finish = "2024-12-04" },
    { id = "winter-2024", season = "winter", year = 2024, start = "2024-12-19", finish = "2025-01-02" },
    -- 2025
    { id = "spring-2025", season = "spring", year = 2025, start = "2025-03-13", finish = "2025-03-20" },
    { id = "summer-2025", season = "summer", year = 2025, start = "2025-06-26", finish = "2025-07-10" },
    { id = "autumn-2025", season = "autumn", year = 2025, start = "2025-09-29", finish = "2025-10-06" },
    { id = "winter-2025", season = "winter", year = 2025, start = "2025-12-18", finish = "2026-01-05" },
    -- 2026
    { id = "spring-2026", season = "spring", year = 2026, start = "2026-03-19", finish = "2026-03-26" },
    { id = "summer-2026", season = "summer", year = 2026, start = "2026-06-25", finish = "2026-07-09" },
    { id = "autumn-2026", season = "autumn", year = 2026, start = "2026-10-01", finish = "2026-10-08" },
    { id = "winter-2026", season = "winter", year = 2026, start = "2026-12-17", finish = "2027-01-04" },
    -- 2027 (announced)
    { id = "autumn-2027", season = "autumn", year = 2027, start = "2027-10-01", finish = "2027-10-08" },
    { id = "winter-2027", season = "winter", year = 2027, start = "2027-12-16", finish = "2028-01-03" },
}

local START_HOUR_UTC = 17

local function to_epoch(date_str)
    local y, m, d = date_str:match("^(%d+)-(%d+)-(%d+)$")
    return util.utc_epoch(tonumber(y), tonumber(m), tonumber(d), START_HOUR_UTC, 0, 0)
end

local SALES = {}
for _, s in ipairs(RAW) do
    table.insert(SALES, {
        id = s.id,
        season = s.season,
        year = s.year,
        start_ts = to_epoch(s.start),
        end_ts = to_epoch(s.finish),
        start = s.start,
        finish = s.finish,
    })
end
table.sort(SALES, function(a, b) return a.start_ts < b.start_ts end)

M.ALL = SALES

-- Plain table safe to JSON-encode for the UI
function M.public(sale)
    if not sale then return nil end
    return { id = sale.id, season = sale.season, year = sale.year, start = sale.start, finish = sale.finish }
end

-- Sale that is running right now, if any
function M.current(now)
    for _, s in ipairs(SALES) do
        if now >= s.start_ts and now < s.end_ts then return s end
    end
    return nil
end

-- Nearest sale that has not started yet
function M.next(now)
    for _, s in ipairs(SALES) do
        if s.start_ts > now then return s end
    end
    return nil
end

-- Sales that have already started, newest first (what we take prices from)
function M.reference(now)
    local out = {}
    for i = #SALES, 1, -1 do
        if SALES[i].start_ts <= now then table.insert(out, SALES[i]) end
    end
    return out
end

-- Signature of the reference set: changes only when a new sale starts,
-- so cached per-game results stay valid until then.
function M.reference_signature(now)
    local ref = M.reference(now)
    local cur = M.current(now)
    -- while a sale runs its prices may still change, so include the day
    local suffix = cur and ("@" .. os.date("!%Y%m%d", now)) or ""
    return (ref[1] and ref[1].id or "none") .. suffix
end

return M
