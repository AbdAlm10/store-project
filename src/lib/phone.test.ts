import { describe, expect, it } from "vitest";
import {
  INTERNATIONAL_PHONE_MESSAGE,
  internationalPhoneError,
} from "@/lib/phone";

describe("internationalPhoneError", () => {
  it("allows a blank number", () => {
    expect(internationalPhoneError("")).toBeNull();
    expect(internationalPhoneError("   ")).toBeNull();
  });

  it("accepts a valid number with a country code", () => {
    expect(internationalPhoneError("+963944123456")).toBeNull();
  });

  it("rejects a number that is missing a valid country code", () => {
    expect(internationalPhoneError("+12")).toBe(INTERNATIONAL_PHONE_MESSAGE);
    expect(internationalPhoneError("0944123456")).toBe(INTERNATIONAL_PHONE_MESSAGE);
  });
});
