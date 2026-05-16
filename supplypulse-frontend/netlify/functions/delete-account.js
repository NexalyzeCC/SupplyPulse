const { verifyUser } = require("./lib/auth");
const { HEADERS, preflight } = require("./lib/cors");
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event) => {
  const pre = preflight(event);
  if (pre) return pre;

  if (event.httpMethod !== "DELETE") {
    return { statusCode: 405, headers: HEADERS, body: "Method Not Allowed" };
  }

  const { user, error: authError } = await verifyUser(event);
  if (authError) {
    return {
      statusCode: 401,
      headers: HEADERS,
      body: JSON.stringify({ error: authError })
    };
  }

  await supabase.from("suppliers").delete().eq("user_id", user.id);

  await supabase.auth.admin.deleteUser(user.id);

  return {
    statusCode: 200,
    headers: HEADERS,
    body: JSON.stringify({ success: true })
  };
};
