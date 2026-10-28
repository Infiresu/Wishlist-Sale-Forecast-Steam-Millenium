--[[
    Core rule: the expected price at the next seasonal sale is the lowest Steam price
    the game had during the most recent seasonal sale where it was discounted.
    If it was not discounted in the latest sale, step back to the one before, and so on.

    Pure functions only, so this file can be unit-tested outside Steam.
]]

local M = {}

-- Prices are sampled this long after a sale starts, to skip any publisher
-- discount that happened to end right at the sale start.
M.START_MARGIN = 6 * 3600

-- Last history entry at or before time t (entries sorted oldest first)
local function price_at(entries, t)
    local found = nil
    for _, e in ipairs(entries) do
        if e.ts <= t then found = e else break end
    end
    return found
end

-- Lowest discounted price during one sale window, or nil
function M.price_in_window(entries, sale)
    local best = nil
    local function consider(e)
        if e and e.cut > 0 and (best == nil or e.price < best.price) then best = e end
    end

    consider(price_at(entries, sale.start_ts + M.START_MARGIN))
    for _, e in ipairs(entries) do
        if e.ts >= sale.start_ts + M.START_MARGIN and e.ts < sale.end_ts then
            consider(e)
        end
    end
    return best
end

-- entries: Steam price history (oldest first); reference_sales: newest first
-- Returns { status = "ok", sale_id, price, regular, cut, currency } or { status = "nodiscount" }
function M.compute(entries, reference_sales)
    if not entries or #entries == 0 then
        return { status = "nodiscount" }
    end
    for _, sale in ipairs(reference_sales) do
        local e = M.price_in_window(entries, sale)
        if e then
            return {
                status = "ok",
                sale_id = sale.id,
                price = e.price,
                regular = e.regular,
                cut = e.cut,
                currency = e.currency,
            }
        end
    end
    return { status = "nodiscount" }
end

return M
