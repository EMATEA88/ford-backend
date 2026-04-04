import crypto from "crypto"

const ALGORITHM = "aes-256-cbc"
const KEY = crypto
  .createHash("sha256")
  .update(String(process.env.BANK_ENCRYPTION_KEY))
  .digest()

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv)

  const encrypted =
    cipher.update(text, "utf8", "hex") + cipher.final("hex")

  return iv.toString("hex") + ":" + encrypted
}

export function decrypt(text: string): string {
  const [ivHex, encrypted] = text.split(":")
  const iv = Buffer.from(ivHex, "hex")

  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv)

  return (
    decipher.update(encrypted, "hex", "utf8") +
    decipher.final("utf8")
  )
}