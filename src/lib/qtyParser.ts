const UNITS = 'kg|g|L|l|ml|cl|pack|x|×|litros|litre|liter';

// Matches patterns like "2kg", "500g", "3 litros", "x6", "×2"
const LEADING_RE = new RegExp(
  `^\\s*(\\d+(?:[.,]\\d+)?)\\s*(${UNITS})?\\s+(?:de\\s+)?(.+)$`,
  'i'
);
const TRAILING_RE = new RegExp(
  `^(.+?)\\s+(\\d+(?:[.,]\\d+)?)\\s*(${UNITS})?\\s*$`,
  'i'
);
const MULT_RE = new RegExp(
  `^(.+?)\\s*[x×]\\s*(\\d+(?:[.,]\\d+)?)\\s*$`,
  'i'
);
const MULT_LEADING_RE = new RegExp(
  `^\\s*[x×]\\s*(\\d+(?:[.,]\\d+)?)\\s+(.+)$`,
  'i'
);

export function parseQtyInput(
  input: string
): { text: string; qty?: string; unit?: string } {
  const trimmed = input.trim();
  if (!trimmed) return { text: trimmed };

  // "2kg leche", "500g harina", "3 litros de leche", "6 eggs"
  let m = trimmed.match(LEADING_RE);
  if (m) {
    const qty = m[1];
    const unit = m[2] || undefined;
    const text = m[3].trim();
    return { text, qty, unit };
  }

  // "leche 2kg", "huevos 500g"
  m = trimmed.match(TRAILING_RE);
  if (m) {
    const text = m[1].trim();
    const qty = m[2];
    const unit = m[3] || undefined;
    return { text, qty, unit };
  }

  // "huevos x6", "leche ×2"
  m = trimmed.match(MULT_RE);
  if (m) {
    const text = m[1].trim();
    const qty = m[2];
    return { text, qty };
  }

  // "x6 huevos"
  m = trimmed.match(MULT_LEADING_RE);
  if (m) {
    const qty = m[1];
    const text = m[2].trim();
    return { text, qty };
  }

  return { text: trimmed };
}
