const { createClient } = require("@supabase/supabase-js");
const { HEADERS, preflight } = require("./lib/cors");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY  // anon key for auth operations
);

exports.handler = async (event) => {
  const pre = preflight(event);
  if (pre) return pre;

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: HEADERS, body: "Method Not Allowed" };
  }

  try {
    const { email, password } = JSON.parse(event.body);

    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      return {
        statusCode: 400,
        headers: HEADERS,
        body: JSON.stringify({ error: error.message })
      };
    }

    return {
      statusCode: 201,
      headers: HEADERS,
      body: JSON.stringify({
        user: data.user,
        session: data.session
      })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: HEADERS,
      body: JSON.stringify({ error: err.message })
    };
  }
};
