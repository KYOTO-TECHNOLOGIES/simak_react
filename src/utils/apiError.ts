const FIELD_LABELS: Record<string, string> = {
  phone_number: "Phone number",
  first_name: "First name",
  last_name: "Last name",
  email: "Email",
  emergency_contact: "Emergency contact",
  assigned_emirates: "Assigned emirates",
  vehicle_number: "Vehicle number",
  identity_number: "Identity number",
  non_field_errors: "Error",
  detail: "Error",
};

function labelForField(key: string): string {
  return FIELD_LABELS[key] ?? key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function collectMessages(value: unknown): string[] {
  if (value == null) return [];
  if (typeof value === "string" && value.trim()) return [value.trim()];
  if (Array.isArray(value)) {
    return value.flatMap((item) => collectMessages(item));
  }
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).flatMap((item) => collectMessages(item));
  }
  return [String(value)];
}

/** Extract a user-facing message from an axios/API error response. */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  const err = error as { response?: { data?: unknown }; message?: string };
  const data = err?.response?.data;

  if (typeof data === "string" && data.trim()) return data.trim();

  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;

    for (const key of ["detail", "message", "error"] as const) {
      const messages = collectMessages(record[key]);
      if (messages.length) return messages.join(" ");
    }

    if (Array.isArray(record.non_field_errors)) {
      const messages = collectMessages(record.non_field_errors);
      if (messages.length) return messages.join(" ");
    }

    const fieldMessages: string[] = [];
    for (const [key, value] of Object.entries(record)) {
      if (["detail", "message", "error", "non_field_errors"].includes(key)) continue;
      const messages = collectMessages(value);
      if (!messages.length) continue;
      const label = labelForField(key);
      fieldMessages.push(`${label}: ${messages.join(" ")}`);
    }
    if (fieldMessages.length) return fieldMessages.join("\n");
  }

  if (err?.message?.trim()) return err.message.trim();
  return fallback;
}
