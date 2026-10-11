"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Bell, Loader2, Mail, MessageSquare, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { apiUrl } from "@/lib/api";

interface Recipient {
  id: string;
  supplier_id: string | null;
  channel: "email" | "slack";
  destination: string;
  enabled: boolean;
}

async function authHeaders(): Promise<HeadersInit | null> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : null;
}

export default function NotificationSection() {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loading, setLoading]       = useState(true);
  const [adding, setAdding]         = useState(false);
  const [channel, setChannel]       = useState<"email" | "slack">("email");
  const [destination, setDestination] = useState("");

  const load = useCallback(async () => {
    const headers = await authHeaders();
    if (!headers) { setLoading(false); return; }

    try {
      const res = await fetch(apiUrl("alert-recipients"), { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setRecipients((await res.json()) as Recipient[]);
    } catch (err) {
      toast.error("Could not load alert destinations", {
        description: err instanceof Error ? err.message : "Network error.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const headers = await authHeaders();
      if (!headers) { if (!cancelled) setLoading(false); return; }

      try {
        const res = await fetch(apiUrl("alert-recipients"), { headers });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const rows = (await res.json()) as Recipient[];
        if (!cancelled) setRecipients(rows);
      } catch (err) {
        if (!cancelled) {
          toast.error("Could not load alert destinations", {
            description: err instanceof Error ? err.message : "Network error.",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!destination.trim()) return;

    setAdding(true);
    const headers = await authHeaders();
    if (!headers) { setAdding(false); return; }

    try {
      const res = await fetch(apiUrl("alert-recipients"), {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ channel, destination: destination.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);

      setDestination("");
      toast.success("Destination added");
      await load();
    } catch (err) {
      toast.error("Could not add destination", {
        description: err instanceof Error ? err.message : "Network error.",
      });
    } finally {
      setAdding(false);
    }
  }

  async function toggle(r: Recipient) {
    const headers = await authHeaders();
    if (!headers) return;

    // Optimistic — revert on failure.
    setRecipients((prev) =>
      prev.map((x) => (x.id === r.id ? { ...x, enabled: !x.enabled } : x)),
    );

    const res = await fetch(apiUrl("alert-recipients"), {
      method: "PATCH",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ id: r.id, enabled: !r.enabled }),
    });

    if (!res.ok) {
      setRecipients((prev) =>
        prev.map((x) => (x.id === r.id ? { ...x, enabled: r.enabled } : x)),
      );
      toast.error("Could not update destination");
    }
  }

  async function remove(id: string) {
    const headers = await authHeaders();
    if (!headers) return;

    const res = await fetch(apiUrl("alert-recipients", { id }), {
      method: "DELETE",
      headers,
    });

    if (res.ok) {
      setRecipients((prev) => prev.filter((r) => r.id !== id));
      toast.success("Destination removed");
    } else {
      toast.error("Could not remove destination");
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
      <div className="mb-4 flex items-center gap-2">
        <Bell className="h-4 w-4 text-slate-500 dark:text-slate-400" />
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Alert destinations
        </h2>
      </div>

      <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
        Where SupplyPulse sends alerts when a supplier drops below its threshold
        or falls 10+ points since the last scan.
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      ) : (
        <ul className="mb-4 space-y-2">
          {recipients.length === 0 && (
            <li className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-400 dark:border-slate-700">
              No destinations yet — you will not receive alerts.
            </li>
          )}
          {recipients.map((r) => (
            <li
              key={r.id}
              className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800"
            >
              {r.channel === "email" ? (
                <Mail className="h-4 w-4 shrink-0 text-slate-400" />
              ) : (
                <MessageSquare className="h-4 w-4 shrink-0 text-purple-400" />
              )}
              <span className="min-w-0 flex-1 truncate text-sm text-slate-700 dark:text-slate-200">
                {r.destination}
              </span>
              {r.supplier_id && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  One supplier
                </span>
              )}
              <label className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-500">
                <input
                  type="checkbox"
                  checked={r.enabled}
                  onChange={() => void toggle(r)}
                  className="h-3.5 w-3.5 rounded border-slate-300"
                />
                On
              </label>
              <button
                onClick={() => void remove(r.id)}
                title="Remove destination"
                className="text-slate-400 transition-colors hover:text-red-500"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={add} className="flex flex-wrap gap-2">
        <select
          value={channel}
          onChange={(e) => setChannel(e.target.value as "email" | "slack")}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        >
          <option value="email">Email</option>
          <option value="slack">Slack webhook</option>
        </select>
        <input
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder={channel === "email" ? "ops@yourcompany.com" : "https://hooks.slack.com/services/…"}
          className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
        <button
          type="submit"
          disabled={adding || !destination.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
        >
          {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Add
        </button>
      </form>
    </section>
  );
}
