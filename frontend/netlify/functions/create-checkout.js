const { verifyUser } = require("./lib/auth");
const { stripe } = require("../../../supplypulse-frontend/netlify/functions/stripe");
const { createClient } = require("@supabase/supabase-js");

const PLAN_PRICES = {
  pro: "STRIPE_PRICE_PRO",
  enterprise: "STRIPE_PRICE_ENTERPRISE",
};

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getOrCreateStripeCustomer(user) {
  const { data: row, error: fetchError } = await supabase
    .from("user_subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message);
  if (row?.stripe_customer_id) return row.stripe_customer_id;

  const customer = await stripe.customers.create({
    email: user.email,
    metadata: { user_id: user.id },
  });

  const { error: upsertError } = await supabase
    .from("user_subscriptions")
    .upsert(
      { user_id: user.id, stripe_customer_id: customer.id },
      { onConflict: "user_id" }
    );

  if (upsertError) throw new Error(upsertError.message);
  return customer.id;
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method Not Allowed" }) };
  }

  const { user, error: authError } = await verifyUser(event);
  if (authError) {
    return { statusCode: 401, body: JSON.stringify({ error: authError }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) };
  }

  const { plan } = body;
  if (!plan || !PLAN_PRICES[plan]) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'plan must be "pro" or "enterprise"' }),
    };
  }

  const priceId = process.env[PLAN_PRICES[plan]];
  if (!priceId) {
    return { statusCode: 500, body: JSON.stringify({ error: "Price not configured" }) };
  }

  const appUrl = process.env.APP_URL?.replace(/\/$/, "");
  if (!appUrl) {
    return { statusCode: 500, body: JSON.stringify({ error: "APP_URL not configured" }) };
  }

  try {
    const customerId = await getOrCreateStripeCustomer(user);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: user.id,
      metadata: { user_id: user.id },
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/dashboard?upgraded=1`,
      cancel_url: `${appUrl}/dashboard?canceled=1`,
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: session.url }),
    };
  } catch (err) {
    console.error("[create-checkout]", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || "Checkout failed" }),
    };
  }
};
