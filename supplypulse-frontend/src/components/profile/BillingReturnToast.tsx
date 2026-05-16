"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";

interface Props {
  upgraded: boolean;
  canceled: boolean;
}

/**
 * Renders no visible UI. Fires a toast once when the user lands back on the
 * profile page from Stripe Checkout, then strips the query params so the
 * toast doesn't re-fire on every navigation/refresh.
 *
 * Note: Stripe Checkout itself confirms the payment instantly, but our local
 * `user_subscriptions` row is only updated when our `stripe-webhook` runs.
 * The toast just acknowledges the return — the actual tier in the page
 * reflects whatever the webhook has persisted by the time the user lands.
 */
export default function BillingReturnToast({ upgraded, canceled }: Props) {
  const router   = useRouter();
  const pathname = usePathname();
  const fired    = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    if (!upgraded && !canceled) return;
    fired.current = true;

    if (upgraded) {
      toast.success("Welcome to your new plan", {
        description:
          "Your subscription is being activated — it should show up within a few seconds.",
      });
    } else if (canceled) {
      toast.info("Checkout canceled", {
        description: "No charge was made. Your plan is unchanged.",
      });
    }

    // Strip query params so the toast doesn't re-fire on refresh
    router.replace(pathname, { scroll: false });
  }, [upgraded, canceled, router, pathname]);

  return null;
}
