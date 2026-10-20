// Same normalization as compute_product_key() in the old migration 018 and
// productKey() in src/lib/itemData.ts: lowercased, trimmed, inner whitespace
// collapsed, "|brand" suffix when a brand is present.
function computeProductKey(name, brand) {
  const norm = (s) => String(s || "").trim().replace(/\s+/g, " ").toLowerCase()
  const b = norm(brand)
  return norm(name) + (b.length > 0 ? "|" + b : "")
}

module.exports = { computeProductKey }
