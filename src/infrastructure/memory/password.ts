import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/** Local demo password. Not a production credential. */
export const DEMO_PASSWORD = "password123";

const DEMO_ACCOUNTS: ReadonlyArray<readonly [string, string]> = [
  ["merchant@alnoor.demo", "00000000-0000-4000-8000-000000000001"],
  ["admin@yourstore.app", "00000000-0000-4000-8000-000000000099"],
];

type PasswordRecord = {
  hash: string;
  userId: string;
};

const globalRecords = globalThis as unknown as {
  __ysPasswordRecords?: Map<string, PasswordRecord>;
};

function records(): Map<string, PasswordRecord> {
  if (!globalRecords.__ysPasswordRecords) {
    globalRecords.__ysPasswordRecords = new Map();
  }
  return globalRecords.__ysPasswordRecords;
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("base64url");
  const hash = scryptSync(password, salt, 32).toString("base64url");
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [algo, salt, hash] = stored.split("$");
  if (algo !== "scrypt" || !salt || !hash) return false;
  const actual = scryptSync(password, salt, 32);
  const expected = Buffer.from(hash, "base64url");
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

export function getPasswordRecord(email: string): PasswordRecord | null {
  return records().get(email.toLowerCase()) ?? null;
}

export function setPasswordRecord(
  email: string,
  userId: string,
  password: string,
): void {
  records().set(email.toLowerCase(), {
    hash: hashPassword(password),
    userId,
  });
}

function ensureDemoAccounts(): void {
  const hash = hashPassword(DEMO_PASSWORD);
  for (const [email, userId] of DEMO_ACCOUNTS) {
    if (!records().has(email)) {
      records().set(email, { hash, userId });
    }
  }
}

ensureDemoAccounts();
