const DEFAULT_CURRENCY_SYMBOL = "$";

export function getCurrencySymbol(): string {
  const symbol = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL?.trim();

  if (!symbol) {
    return DEFAULT_CURRENCY_SYMBOL;
  }

  return symbol;
}

export function formatCurrencyAmount(amount: number, locale = "en-US"): string {
  const symbol = getCurrencySymbol();
  const absoluteAmount = Math.abs(amount);
  const formattedAmount = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(absoluteAmount);

  if (amount < 0) {
    return `-${symbol}${formattedAmount}`;
  }

  return `${symbol}${formattedAmount}`;
}
