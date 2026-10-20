// validateReceipt — ported from the parse-receipt Edge Function (same logic,
// TypeScript annotations removed).
function validateReceipt(obj) {
  if (!obj || typeof obj !== "object") return null
  const o = obj
  if (!Array.isArray(o.lines)) return null
  return {
    store: typeof o.store === "string" ? o.store : null,
    store_address: typeof o.store_address === "string" ? o.store_address : null,
    nip: typeof o.nip === "string" ? o.nip : null,
    date: typeof o.date === "string" ? o.date : null,
    currency: typeof o.currency === "string" ? o.currency : "EUR",
    total: typeof o.total === "number" ? o.total : null,
    lines: o.lines.map((l) => {
      const line = l || {}
      const translations = {}
      if (line.translations && typeof line.translations === "object") {
        for (const [k, v] of Object.entries(line.translations)) {
          if (typeof v === "string") translations[k] = v
        }
      }
      return {
        raw_name: typeof line.raw_name === "string" ? line.raw_name : "",
        expanded_name: typeof line.expanded_name === "string" ? line.expanded_name : null,
        translations,
        category: typeof line.category === "string" ? line.category : "other",
        brand: typeof line.brand === "string" ? line.brand : null,
        qty: typeof line.qty === "number" ? line.qty : null,
        unit: typeof line.unit === "string" ? line.unit : null,
        unit_price: typeof line.unit_price === "number" ? line.unit_price : null,
        total_price: typeof line.total_price === "number" ? line.total_price : null,
        discount: typeof line.discount === "number" ? line.discount : 0,
        tax_category: typeof line.tax_category === "string" ? line.tax_category : null,
        confidence: typeof line.confidence === "string" ? line.confidence : "high",
      }
    }).filter((l) => l.raw_name.length > 0),
  }
}

module.exports = { validateReceipt }
