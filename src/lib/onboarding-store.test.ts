import { describe, expect, it } from "vitest";
import { isReadyStore, readyStores } from "@/lib/onboarding-store";

describe("onboarding store readiness", () => {
  it("ignores a blank store and keeps a finished one", () => {
    const blank = { name: " ", slug: "" };
    const ready = { name: "Al Noor", slug: "alnoor" };
    expect(isReadyStore(blank)).toBe(false);
    expect(isReadyStore(ready)).toBe(true);
    expect(readyStores([blank, ready])).toEqual([ready]);
    expect(readyStores([blank])).toEqual([]);
  });
});
