import { createHash, createHmac } from "node:crypto";

export function hashPhoneForAccount(e164: string): string {
  return createHash("sha256").update(`tedbirge/phone/v1:${e164}`).digest("hex");
}

export function deriveAccountPassword(e164: string, pepper: string): string {
  return createHmac("sha256", pepper)
    .update(`tedbirge/account/v1:${e164}`)
    .digest("base64url");
}