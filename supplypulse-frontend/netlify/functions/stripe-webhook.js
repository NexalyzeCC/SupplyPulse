const { stripe } = require("./lib/stripe-client");
const { tierFromSubscription } = require("./stripe-tiers");
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function periodEndIso(subscription) {
  if (!subscription?.current_period_end) return null;
  return new Date(subscription.current_period_end * 1000).toISOString();
}

async function syncUserProfileTier(userId, tier) {
  if (!tier) return;
  await supabase.from("user_profiles").update({ tier }).eq("id", userId);
}

async function upsertUserSubscription(userId, fields) {
  const { error } = await supabase
    .from("user_subscriptions")
    .upsert({ user_id: userId, ...fields }, { onConflict: "user_id" });

  if (error) throw error;
  if (fields.tier) await syncUserProfileTier(userId, fields.tier);
}

async function userIdFromCustomer(customerId) {
  if (!customerId) return null;
  const { data } = await supabase
    .from("user_subscriptions")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  return data?.user_id ?? null;
}

async function resolveUserIdFromSubscription(subscription) {
  if (subscription.metadata?.user_id) return subscription.metadata.user_id;
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id;
  return userIdFromCustomer(customerId);
}

async function handleCheckoutCompleted(session) {
  const userId = session.metadata?.user_id || session.client_reference_id;
  if (!userId) {
    console.warn("[stripe-webhook] checkout.session.completed: missing user_id");
    return;
  }

  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;

  let subscription = null;
  if (subscriptionId) {
    subscription = await stripe.subscriptions.retrieve(subscriptionId);
  }

  const tier = (subscription && tierFromSubscription(subscription)) || "pro";

  await upsertUserSubscription(userId, {
    tier,
    status: "active",
    stripe_customer_id:
      typeof session.customer === "string" ? session.customer : session.customer?.id,
    stripe_subscription_id: subscriptionId ?? null,
    current_period_end: periodEndIso(subscription),
  });
}

async function handleSubscriptionUpdated(subscription) {
  const userId = await resolveUserIdFromSubscription(subscription);
  if (!userId) {
    console.warn("[stripe-webhook] customer.subscription.updated: unknown user");
    return;
  }

  const tier = tierFromSubscription(subscription) || "starter";
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id;

  await upsertUserSubscription(userId, {
    tier,
    status: subscription.status,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    current_period_end: periodEndIso(subscription),
  });
}

async function handleSubscriptionDeleted(subscription) {
  const userId = await resolveUserIdFromSubscription(subscription);
  if (!userId) {
    console.warn("[stripe-webhook] customer.subscription.deleted: unknown user");
    return;
  }

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id;

  await upsertUserSubscription(userId, {
    tier: "starter",
    status: "canceled",
    stripe_customer_id: customerId,
    stripe_subscription_id: null,
    current_period_end: null,
  });
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const sig = event.headers["stripe-signature"] || event.headers["Stripe-Signature"];
  const rawBody = event.isBase64Encoded
    ? Buffer.from(event.body, "base64")
    : event.body;

  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("[stripe-webhook] signature verification failed:", err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  try {
    switch (stripeEvent.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(stripeEvent.data.object);
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(stripeEvent.data.object);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(stripeEvent.data.object);
        break;
      default:
        break;
    }
  } catch (err) {
    console.error(`[stripe-webhook] ${stripeEvent.type}:`, err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
