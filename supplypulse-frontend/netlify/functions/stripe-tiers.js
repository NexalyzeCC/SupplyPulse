function priceToTierMap() {
  const map = {};
  if (process.env.STRIPE_PRICE_PRO) map[process.env.STRIPE_PRICE_PRO] = "pro";
  if (process.env.STRIPE_PRICE_ENTERPRISE) {
    map[process.env.STRIPE_PRICE_ENTERPRISE] = "enterprise";
  }
  return map;
}

function tierFromPriceId(priceId) {
  if (!priceId) return null;
  return priceToTierMap()[priceId] ?? null;
}

function tierFromSubscription(subscription) {
  const priceId =
    subscription.items?.data?.[0]?.price?.id ??
    subscription.items?.data?.[0]?.plan?.id;
  return tierFromPriceId(priceId);
}

module.exports = { tierFromPriceId, tierFromSubscription };
