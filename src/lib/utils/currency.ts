/**
 * Format a number as Indian Rupees (₹)
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format a number with Indian grouping (e.g., 1,23,456.78)
 */
export function formatNumber(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Parse a currency string back to number
 */
export function parseCurrency(value: string): number {
  return parseFloat(value.replace(/[₹,\s]/g, '')) || 0;
}
