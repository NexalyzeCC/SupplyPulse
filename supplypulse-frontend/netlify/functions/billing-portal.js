const { verifyUser } = require("./lib/auth");
const { stripe } = require("./lib/stripe-client");
const { HEADERS, preflight } = require("./lib/cors");
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event) => {
  const pre = preflight(event);
  if (pre) return pre;

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ error: "Method Not Allowed" }) };
  }

  const { user, error: authError } = await verifyUser(event);
  if (authError) {
    return { statusCode: 401, headers: HEADERS, body: JSON.stringify({ error: authError }) };
  }

  const appUrl = process.env.APP_URL?.replace(/\/$/, "");
  if (!appUrl) {
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: "APP_URL not configured" }) };
  }

  const { data: sub, error: fetchError } = await supabase
    .from("user_subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchError) {
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: fetchError.message }) };
  }

  if (!sub?.stripe_customer_id) {
    return {
      statusCode: 404,
      headers: HEADERS,
      body: JSON.stringify({ error: "No billing account found. Subscribe to a plan first." }),
    };
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${appUrl}/dashboard`,
    });

    return {
      statusCode: 200,
      headers: { ...HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ url: session.url }),
    };
  } catch (err) {
    console.error("[billing-portal]", err);
    return {
      statusCode: 500,
      headers: HEADERS,
      body: JSON.stringify({ error: err.message || "Billing portal failed" }),
    };
  }
};
