import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual
} from "node:crypto";
import {
  promisify
} from "node:util";

const scrypt = promisify(scryptCallback);

const PIN_PATTERN = /^\d{4,8}$/;
const SALT_LENGTH = 16;
const DERIVED_KEY_LENGTH = 64;
const HASH_PREFIX = "scrypt";

export function assertTeamAccessPin(
  pin: string
): void {
  if (!PIN_PATTERN.test(pin)) {
    throw new Error(
      "Team access PIN must contain between 4 and 8 digits"
    );
  }
}

export async function hashTeamAccessPin(
  pin: string
): Promise<string> {
  assertTeamAccessPin(pin);

  const salt =
    randomBytes(SALT_LENGTH).toString("hex");

  const derivedKey =
    await scrypt(
      pin,
      salt,
      DERIVED_KEY_LENGTH
    ) as Buffer;

  return [
    HASH_PREFIX,
    salt,
    derivedKey.toString("hex")
  ].join("$");
}

export async function verifyTeamAccessPin(
  pin: string,
  storedHash: string
): Promise<boolean> {
  if (!PIN_PATTERN.test(pin)) {
    return false;
  }

  const hashParts = storedHash.split("$");

  if (hashParts.length !== 3) {
    return false;
  }

  const [
    algorithm,
    salt,
    expectedHash
  ] = hashParts;

  if (
    algorithm !== HASH_PREFIX ||
    !salt ||
    !expectedHash ||
    !/^[0-9a-f]+$/.test(salt) ||
    salt.length !== SALT_LENGTH * 2 ||
    !/^[0-9a-f]+$/.test(expectedHash)
  ) {
    return false;
  }

  let expectedBuffer: Buffer;

  try {
    expectedBuffer =
      Buffer.from(expectedHash, "hex");
  } catch {
    return false;
  }

  if (
    expectedBuffer.length !== DERIVED_KEY_LENGTH
  ) {
    return false;
  }

  const actualBuffer =
    await scrypt(
      pin,
      salt,
      DERIVED_KEY_LENGTH
    ) as Buffer;

  return timingSafeEqual(
    actualBuffer,
    expectedBuffer
  );
}
