import { createHmac } from "node:crypto";

export function deriveAccountPassword(e164: string, pepper: string): string {
  return createHmac("sha256", pepper).update(`tedbirge/account/v1:${e164}`).digest("base64url");
}
