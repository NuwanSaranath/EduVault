// simple email check
export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

// at least 6 characters
export function isValidPassword(value: string): boolean {
  return value.length >= 6;
}

// not blank
export function isNonEmpty(value: string): boolean {
  return value.trim().length > 0;
}
