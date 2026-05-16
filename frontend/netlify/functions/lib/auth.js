const { createServiceClient } = require("./supabase");

async function verifyUser(event) {
  const supabase = createServiceClient();
  const authHeader = event.headers?.authorization || event.headers?.Authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return { user: null, error: "Missing authorization header" };
  }

  const token = authHeader.split(" ")[1];

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return { user: null, error: "Invalid or expired token" };
  }

  return { user, error: null };
}

module.exports = { verifyUser };
