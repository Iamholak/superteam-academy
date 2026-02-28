export const WALLET_AUTH_MESSAGE = 'Superteam Academy wallet auth v1'

export function walletToEmail(walletAddress: string): string {
  return `${walletAddress.toLowerCase()}@wallet.superteam.local`
}

export function signatureToPassword(signature: Uint8Array): string {
  const hex = Array.from(signature)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  return `wa_${hex}`
}

export function isInvalidCredentialsError(message: string): boolean {
  const m = message.toLowerCase()
  return m.includes('invalid login credentials') || m.includes('invalid credentials')
}
