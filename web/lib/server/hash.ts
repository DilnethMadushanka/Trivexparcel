import "server-only";
import { createHmac } from "node:crypto";

/** Phone numbers are never stored. Only this keyed hash is. */
export function hashNumber(normalized: string): string {
  const secret = process.env.HASH_SECRET;
  if (!secret || secret.length < 32) throw new Error("HASH_SECRET must be set (32+ characters)");
  return createHmac("sha256", secret).update("hariyata.v1:" + normalized).digest("hex");
}
