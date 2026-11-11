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

/**
 * A new random id (a version 4 UUID), the same form the database uses, so
 * things made on the phone keep their id when they're saved to the server.
 * The prefix only documents what the id is for at the call site.
 */
export function newId(_prefix: string): string {
  const bytes = new Uint8Array(16);
  const cryptoApi = (globalThis as { crypto?: { getRandomValues?: (a: Uint8Array) => Uint8Array } }).crypto;
  if (cryptoApi?.getRandomValues) cryptoApi.getRandomValues(bytes);
  else for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** True for a US mobile number or an email address. */
export function isValidContact(value: string): boolean {
  const v = value.trim();
  if (v.includes('@')) return isValidEmail(v);
  const d = digitsOnly(v);
  return d.length === 10 || (d.length === 11 && d.startsWith('1'));
}
