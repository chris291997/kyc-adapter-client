/**
 * Generate a secure random HMAC secret
 * @param bytes - Number of random bytes (default: 32)
 * @returns Base64-encoded random string
 */
export function generateHMACSecret(bytes = 32): string {
  const array = new Uint8Array(bytes)
  crypto.getRandomValues(array)
  return btoa(String.fromCharCode(...array))
}

/**
 * Generate a secure random hex string
 * @param bytes - Number of random bytes (default: 32)
 * @returns Hex-encoded random string
 */
export function generateRandomHex(bytes = 32): string {
  const array = new Uint8Array(bytes)
  crypto.getRandomValues(array)
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (error) {
    console.error('Failed to copy to clipboard:', error)
    return false
  }
}


