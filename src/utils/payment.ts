/** Map backend payment method codes to user-facing labels (Ziina → Card). */
export function normalizeDisplayPaymentMethod(
  raw?: string | null,
  fallback = "N/A"
): string {
  if (!raw?.trim()) return fallback;

  const key = raw.trim().toLowerCase();
  const map: Record<string, string> = {
    ziina: "Card",
    card: "Card",
    cod: "COD",
    cash_on_delivery: "COD",
    upi: "UPI",
    netbanking: "NetBanking",
    wallet: "Wallet",
  };

  return map[key] ?? raw;
}

/** Backend filter value when admin UI shows "Card". */
export function paymentMethodToApiValue(displayMethod: string): string | undefined {
  const key = displayMethod.trim().toLowerCase();
  const map: Record<string, string> = {
    card: "ZIINA",
    cod: "COD",
    upi: "UPI",
    netbanking: "NETBANKING",
    wallet: "WALLET",
  };
  return map[key];
}
