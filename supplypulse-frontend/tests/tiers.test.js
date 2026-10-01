import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { checkSupplierLimit, effectiveTier } = require("../netlify/functions/suppliers");
const { tierFromSubscription, tierFromPriceId } = require("../netlify/functions/stripe-tiers");

describe("effectiveTier", () => {
  it("falls back to starter with no subscription row", () => {
    expect(effectiveTier(null)).toBe("starter");
    expect(effectiveTier(undefined)).toBe("starter");
  });

  it("falls back to starter when the subscription is not active", () => {
    expect(effectiveTier({ tier: "pro", status: "past_due" })).toBe("starter");
    expect(effectiveTier({ tier: "pro", status: "canceled" })).toBe("starter");
  });

  it("honours an active subscription", () => {
    expect(effectiveTier({ tier: "enterprise", status: "active" })).toBe("enterprise");
  });
});

describe("checkSupplierLimit", () => {
  const active = (tier) => ({ tier, status: "active" });

  it("blocks a starter user at 3 suppliers", () => {
    expect(checkSupplierLimit(active("starter"), 2).allowed).toBe(true);
    expect(checkSupplierLimit(active("starter"), 3).allowed).toBe(false);
  });

  it("blocks a pro user at 25 suppliers", () => {
    expect(checkSupplierLimit(active("pro"), 24).allowed).toBe(true);
    expect(checkSupplierLimit(active("pro"), 25).allowed).toBe(false);
  });

  it("never blocks enterprise", () => {
    expect(checkSupplierLimit(active("enterprise"), 10_000).allowed).toBe(true);
  });

  it("treats a lapsed pro user as starter", () => {
    const res = checkSupplierLimit({ tier: "pro", status: "canceled" }, 5);
    expect(res.allowed).toBe(false);
    expect(res.limit).toBe(3);
  });
});

describe("stripe tier mapping", () => {
  it("maps a configured price id to its tier", () => {
    process.env.STRIPE_PRICE_PRO = "price_teams_123";
    process.env.STRIPE_PRICE_ENTERPRISE = "price_business_456";
    expect(tierFromPriceId("price_teams_123")).toBe("pro");
    expect(tierFromPriceId("price_business_456")).toBe("enterprise");
  });

  it("returns null for an unknown or missing price id", () => {
    expect(tierFromPriceId("price_unknown")).toBeNull();
    expect(tierFromPriceId(null)).toBeNull();
  });

  it("reads the price id out of a subscription object", () => {
    process.env.STRIPE_PRICE_PRO = "price_teams_123";
    const sub = { items: { data: [{ price: { id: "price_teams_123" } }] } };
    expect(tierFromSubscription(sub)).toBe("pro");
  });
});
