/**
 * Converts integer paise to decimal rupees.
 */
export function paiseToRupees(minorUnits: number): number {
  return minorUnits / 100;
}

/**
 * Parses user input string (e.g. "125", "125.5", "125.50", "1,25,000")
 * into exact integer paise without floating point inaccuracy.
 */
export function rupeesToPaise(input: string | number): number {
  if (typeof input === 'number') {
    return Math.round(input * 100);
  }

  // Strip currency symbols, spaces, and commas
  const cleaned = input.replace(/[₹$,\s]/g, '');
  if (!cleaned || cleaned.trim() === '') {
    return 0;
  }

  const parts = cleaned.split('.');
  const wholePart = parseInt(parts[0] || '0', 10);
  if (isNaN(wholePart)) {
    throw new Error(`Invalid amount string: ${input}`);
  }

  let paisePart = 0;
  if (parts.length > 1) {
    const decimalString = (parts[1] + '00').slice(0, 2);
    paisePart = parseInt(decimalString, 10);
  }

  const isNegative = wholePart < 0 || cleaned.startsWith('-');
  const total = Math.abs(wholePart) * 100 + paisePart;
  return isNegative ? -total : total;
}

/**
 * Formats integer paise into Indian currency notation (e.g. ₹1,25,000).
 */
export function formatMoney(
  minorUnits: number,
  currency: string = 'INR',
  options: {
    showPaiseIfZero?: boolean;
    includeSign?: boolean;
    locale?: string;
  } = {}
): string {
  const { showPaiseIfZero = false, includeSign = false, locale = 'en-IN' } = options;

  const isNegative = minorUnits < 0;
  const absMinor = Math.abs(minorUnits);
  const rupees = absMinor / 100;
  const hasPaise = absMinor % 100 !== 0;

  const fractionDigits = hasPaise || showPaiseIfZero ? 2 : 0;

  try {
    const formatted = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(rupees);

    if (includeSign && minorUnits > 0) {
      return `+${formatted}`;
    }
    if (isNegative) {
      // In case Intl doesn't include minus or places it differently
      return formatted.startsWith('-') ? formatted : `-${formatted}`;
    }
    return formatted;
  } catch {
    // Fallback if Intl fails
    const fixed = (absMinor / 100).toFixed(fractionDigits);
    const sign = isNegative ? '-' : includeSign && minorUnits > 0 ? '+' : '';
    return `${sign}₹${fixed}`;
  }
}
