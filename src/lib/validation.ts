const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL.test(email.trim());
}

/** Keeps only digits. */
export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

/** US numbers: exactly 10 digits after the country code. */
export function isValidUsPhone(value: string): boolean {
  return digitsOnly(value).length === 10;
}

/** "9793793817" -> "(979) 379-3817" */
export function formatUsPhone(value: string): string {
  const d = digitsOnly(value).slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

/** "+19793793817" -> "+1 (979) 379-3817"; other formats are returned unchanged. */
export function formatE164UsPhone(value: string): string {
  const d = digitsOnly(value);
  return d.length === 11 && d.startsWith('1') ? `+1 ${formatUsPhone(d.slice(1))}` : value;
}

export function isValidZip(value: string): boolean {
  return /^\d{5}$/.test(value.trim());
}

export function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/** True for a US mobile number or an email address. */
export function isValidContact(value: string): boolean {
  const v = value.trim();
  if (v.includes('@')) return isValidEmail(v);
  const d = digitsOnly(v);
  return d.length === 10 || (d.length === 11 && d.startsWith('1'));
}
