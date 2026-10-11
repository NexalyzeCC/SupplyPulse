/**
 * scan-worker-cron — every 10 minutes, nudges the background worker.
 *
 * Catches jobs whose inline kick was lost and retries that have come due.
 * A -background function can't be scheduled directly, hence this wrapper.
 */

const { schedule } = require("@netlify/functions");

const handler = async () => {
  try {
    const res = await fetch(`${process.env.URL}/.netlify/functions/scan-worker-background`, {
      method:  "POST",
      headers: { "X-Scheduled-Secret": process.env.SCHEDULED_SECRET ?? "" },
    });
    console.log("[scan-worker-cron] kicked worker:", res.status);
  } catch (err) {
    console.error("[scan-worker-cron] kick failed:", err.message);
  }
  return { statusCode: 200 };
};

exports.handler = schedule("*/10 * * * *", handler);
