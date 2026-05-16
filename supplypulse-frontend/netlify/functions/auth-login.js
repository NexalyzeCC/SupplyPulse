const { createClient } = require("@supabase/supabase-js");
const { HEADERS, preflight } = require("./lib/cors");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

exports.handler = async (event) => {
  const pre = preflight(event);
  if (pre) return pre;

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: HEADERS, body: "Method Not Allowed" };
  }

  try {
    const { email, password } = JSON.parse(event.body);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return {
        statusCode: 401,
        headers: HEADERS,
        body: JSON.stringify({ error: error.message })
      };
    }

    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({
        user: data.user,
        session: data.session  // contains access_token the frontend uses
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
