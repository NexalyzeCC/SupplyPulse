const { createAnonClient } = require("./lib/supabase");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const supabase = createAnonClient();
    const { email, password } = JSON.parse(event.body);

    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      return { statusCode: 400, body: JSON.stringify({ error: error.message }) };
    }

    return {
      statusCode: 201,
      body: JSON.stringify({
        user: data.user,
        session: data.session
      })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
