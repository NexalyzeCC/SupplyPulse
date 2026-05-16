const { verifyUser } = require("./lib/auth");
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event) => {
  if (event.httpMethod !== "DELETE") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const { user, error: authError } = await verifyUser(event);
  if (authError) {
    return { statusCode: 401, body: JSON.stringify({ error: authError }) };
  }

  // Delete all suppliers — cascade handles scores + alerts automatically
  await supabase.from("suppliers").delete().eq("user_id", user.id);

  // Delete the auth user
  await supabase.auth.admin.deleteUser(user.id);

  return {
    statusCode: 200,
    body: JSON.stringify({ success: true })
  };
};