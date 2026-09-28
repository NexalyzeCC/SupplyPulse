


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."create_starter_subscription"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO user_subscriptions (user_id, tier) VALUES (NEW.id, 'starter')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END; $$;


ALTER FUNCTION "public"."create_starter_subscription"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.user_profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."alert_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "supplier_id" "uuid" NOT NULL,
    "score_id" "uuid",
    "channel" "text" NOT NULL,
    "sent_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "alert_log_channel_check" CHECK (("channel" = ANY (ARRAY['email'::"text", 'slack'::"text"])))
);


ALTER TABLE "public"."alert_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."scores" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "supplier_id" "uuid",
    "score" integer NOT NULL,
    "risk" "text" NOT NULL,
    "news_signal" integer,
    "financial_signal" integer,
    "legal_signal" integer,
    "alerts" "jsonb" DEFAULT '[]'::"jsonb",
    "summary" "text",
    "scored_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."scores" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."supplier_scores" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "supplier_id" "uuid" NOT NULL,
    "score" integer NOT NULL,
    "direction" "text" DEFAULT 'stable'::"text" NOT NULL,
    "summary" "text",
    "recommendations" "jsonb" DEFAULT '[]'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "supplier_scores_direction_check" CHECK (("direction" = ANY (ARRAY['improving'::"text", 'stable'::"text", 'deteriorating'::"text"]))),
    CONSTRAINT "supplier_scores_score_check" CHECK ((("score" >= 0) AND ("score" <= 100)))
);


ALTER TABLE "public"."supplier_scores" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."supplier_signals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "score_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "severity" "text" NOT NULL,
    "summary" "text" NOT NULL,
    "source_url" "text",
    "confidence" integer DEFAULT 70 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "source_title" "text",
    "signal_date" "date",
    CONSTRAINT "supplier_signals_confidence_check" CHECK ((("confidence" >= 0) AND ("confidence" <= 100))),
    CONSTRAINT "supplier_signals_severity_check" CHECK (("severity" = ANY (ARRAY['low'::"text", 'medium'::"text", 'high'::"text", 'critical'::"text"]))),
    CONSTRAINT "supplier_signals_type_check" CHECK (("type" = ANY (ARRAY['news'::"text", 'financial'::"text", 'legal'::"text", 'operational'::"text", 'leadership'::"text"])))
);


ALTER TABLE "public"."supplier_signals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."suppliers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "category" "text",
    "country" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "criticality" "text" DEFAULT 'medium'::"text" NOT NULL,
    "alert_threshold" integer DEFAULT 40 NOT NULL,
    "slack_webhook" "text",
    CONSTRAINT "suppliers_alert_threshold_check" CHECK ((("alert_threshold" >= 0) AND ("alert_threshold" <= 100))),
    CONSTRAINT "suppliers_criticality_check" CHECK (("criticality" = ANY (ARRAY['low'::"text", 'medium'::"text", 'high'::"text", 'critical'::"text"])))
);


ALTER TABLE "public"."suppliers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_profiles" (
    "id" "uuid" NOT NULL,
    "tier" "text" DEFAULT 'starter'::"text" NOT NULL,
    CONSTRAINT "user_profiles_tier_check" CHECK (("tier" = ANY (ARRAY['starter'::"text", 'pro'::"text", 'enterprise'::"text"])))
);


ALTER TABLE "public"."user_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_subscriptions" (
    "user_id" "uuid" NOT NULL,
    "tier" "text" DEFAULT 'starter'::"text" NOT NULL,
    "stripe_customer_id" "text",
    "stripe_subscription_id" "text",
    "status" "text" DEFAULT 'active'::"text",
    "current_period_end" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_subscriptions" OWNER TO "postgres";


ALTER TABLE ONLY "public"."alert_log"
    ADD CONSTRAINT "alert_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."scores"
    ADD CONSTRAINT "scores_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."supplier_scores"
    ADD CONSTRAINT "supplier_scores_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."supplier_signals"
    ADD CONSTRAINT "supplier_signals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."suppliers"
    ADD CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_subscriptions"
    ADD CONSTRAINT "user_subscriptions_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."user_subscriptions"
    ADD CONSTRAINT "user_subscriptions_stripe_customer_id_key" UNIQUE ("stripe_customer_id");



ALTER TABLE ONLY "public"."user_subscriptions"
    ADD CONSTRAINT "user_subscriptions_stripe_subscription_id_key" UNIQUE ("stripe_subscription_id");



CREATE INDEX "idx_alert_log_supplier_id" ON "public"."alert_log" USING "btree" ("supplier_id", "sent_at" DESC);



CREATE INDEX "idx_supplier_scores_supplier_id" ON "public"."supplier_scores" USING "btree" ("supplier_id", "created_at" DESC);



CREATE INDEX "idx_supplier_signals_score_id" ON "public"."supplier_signals" USING "btree" ("score_id");



CREATE INDEX "scores_supplier_id_scored_at_idx" ON "public"."scores" USING "btree" ("supplier_id", "scored_at" DESC);



ALTER TABLE ONLY "public"."alert_log"
    ADD CONSTRAINT "alert_log_score_id_fkey" FOREIGN KEY ("score_id") REFERENCES "public"."supplier_scores"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."alert_log"
    ADD CONSTRAINT "alert_log_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."scores"
    ADD CONSTRAINT "scores_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."supplier_scores"
    ADD CONSTRAINT "supplier_scores_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."supplier_signals"
    ADD CONSTRAINT "supplier_signals_score_id_fkey" FOREIGN KEY ("score_id") REFERENCES "public"."supplier_scores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_subscriptions"
    ADD CONSTRAINT "user_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Users manage own profile" ON "public"."user_profiles" USING (("id" = "auth"."uid"())) WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "Users see own scores" ON "public"."scores" USING (("supplier_id" IN ( SELECT "suppliers"."id"
   FROM "public"."suppliers"
  WHERE ("suppliers"."user_id" = ("auth"."uid"())::"text"))));



CREATE POLICY "Users see own suppliers" ON "public"."suppliers" USING (("user_id" = ("auth"."uid"())::"text"));



ALTER TABLE "public"."alert_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."scores" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."supplier_scores" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."supplier_signals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."suppliers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_reads_own_subscription" ON "public"."user_subscriptions" FOR SELECT USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."user_subscriptions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users_own_alerts" ON "public"."alert_log" USING (("supplier_id" IN ( SELECT "suppliers"."id"
   FROM "public"."suppliers"
  WHERE (("auth"."uid"())::"text" = "suppliers"."user_id"))));



CREATE POLICY "users_own_scores" ON "public"."supplier_scores" USING (("supplier_id" IN ( SELECT "suppliers"."id"
   FROM "public"."suppliers"
  WHERE (("auth"."uid"())::"text" = "suppliers"."user_id"))));



CREATE POLICY "users_own_signals" ON "public"."supplier_signals" USING (("score_id" IN ( SELECT "ss"."id"
   FROM ("public"."supplier_scores" "ss"
     JOIN "public"."suppliers" "s" ON (("s"."id" = "ss"."supplier_id")))
  WHERE (("auth"."uid"())::"text" = "s"."user_id"))));



CREATE POLICY "users_own_suppliers" ON "public"."suppliers" USING ((("auth"."uid"())::"text" = "user_id"));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."create_starter_subscription"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_starter_subscription"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_starter_subscription"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";


















GRANT ALL ON TABLE "public"."alert_log" TO "anon";
GRANT ALL ON TABLE "public"."alert_log" TO "authenticated";
GRANT ALL ON TABLE "public"."alert_log" TO "service_role";



GRANT ALL ON TABLE "public"."scores" TO "anon";
GRANT ALL ON TABLE "public"."scores" TO "authenticated";
GRANT ALL ON TABLE "public"."scores" TO "service_role";



GRANT ALL ON TABLE "public"."supplier_scores" TO "anon";
GRANT ALL ON TABLE "public"."supplier_scores" TO "authenticated";
GRANT ALL ON TABLE "public"."supplier_scores" TO "service_role";



GRANT ALL ON TABLE "public"."supplier_signals" TO "anon";
GRANT ALL ON TABLE "public"."supplier_signals" TO "authenticated";
GRANT ALL ON TABLE "public"."supplier_signals" TO "service_role";



GRANT ALL ON TABLE "public"."suppliers" TO "anon";
GRANT ALL ON TABLE "public"."suppliers" TO "authenticated";
GRANT ALL ON TABLE "public"."suppliers" TO "service_role";



GRANT ALL ON TABLE "public"."user_profiles" TO "anon";
GRANT ALL ON TABLE "public"."user_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."user_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."user_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."user_subscriptions" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































