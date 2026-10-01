import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.{js,ts}"],
    env: {
      SUPABASE_URL: `${process.env.SUPABASE_URL}`,
      SUPABASE_SERVICE_ROLE_KEY: `${process.env.SUPABASE_SERVICE_ROLE_KEY }`,
    },
  },
});
