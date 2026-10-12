import { describe, expect, it } from "vitest";
import { createStoreSchema, updateStoreSchema } from "@/validations/schemas";

describe("reserved store slugs", () => {
  it("rejects app routes so a store cannot shadow them", () => {
    for (const slug of ["pricing", "login", "dashboard", "admin", "api", "auth"]) {
      expect(
        createStoreSchema.safeParse({
          name: "Test Store",
          slug,
          currency: "USD",
        }).success,
      ).toBe(false);
    }
  });

  it("still allows a normal store slug", () => {
    expect(
      createStoreSchema.safeParse({
        name: "Al Noor",
        slug: "alnoor",
        currency: "USD",
      }).success,
    ).toBe(true);
  });
});

describe("international phone fields", () => {
  it("accepts a valid number with a country calling code", () => {
    expect(
      createStoreSchema.safeParse({
        name: "Al Noor",
        slug: "al-noor",
        currency: "USD",
        whatsapp: "+963944123456",
      }).success,
    ).toBe(true);
  });

  it("rejects a number longer than its country's allowed length", () => {
    expect(
      updateStoreSchema.safeParse({
        phone: "+9639441234567",
      }).success,
    ).toBe(false);
  });
});