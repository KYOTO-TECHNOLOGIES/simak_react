export const UAE_COUNTRY_CODE = "+971";

/** Normalize any pasted/full value to up to 9 local UAE mobile digits. */
export function parseUaeLocalDigits(input: string): string {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("971")) digits = digits.slice(3);
  if (digits.startsWith("0")) digits = digits.slice(1);
  return digits.slice(0, 9);
}

/** Format local digits as 5XX XXX XXX while typing. */
export function formatUaeLocalDisplay(local: string): string {
  const d = parseUaeLocalDigits(local);
  if (!d) return "";
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)} ${d.slice(3)}`;
  return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
}

/** E.164 UAE mobile, e.g. +971545446111 */
export function toUaeE164(local: string): string {
  const digits = parseUaeLocalDigits(local);
  return digits ? `${UAE_COUNTRY_CODE}${digits}` : "";
}

export function phoneFromApiToLocal(phone?: string | null): string {
  if (!phone) return "";
  return parseUaeLocalDigits(phone);
}

export function validateUaeMobile(
  local: string,
  options: { required?: boolean } = {}
): string | null {
  const digits = parseUaeLocalDigits(local);
  if (!digits) {
    return options.required ? "UAE mobile number is required." : null;
  }
  if (digits.length !== 9) {
    return "Enter a valid 9-digit UAE mobile number.";
  }
  if (!/^5\d{8}$/.test(digits)) {
    return "UAE mobile numbers must start with 5 (e.g. 54 544 6111).";
  }
  return null;
}

/** Restrict input to UAE mobile local digits (5XXXXXXXX). */
export function sanitizeUaeLocalInput(raw: string): string {
  let digits = parseUaeLocalDigits(raw);
  if (!digits) return "";
  if (digits[0] !== "5") {
    digits = `5${digits.replace(/^5?/, "")}`;
  }
  return digits.slice(0, 9);
}
