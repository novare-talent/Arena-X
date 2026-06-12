import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const CASHFREE_API = "https://api.cashfree.com/pg/links";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const phone = String(body.phone ?? "").replace(/\s/g, "");
    if (!/^\d{10}$/.test(phone)) {
      return NextResponse.json({ error: "Enter a valid 10-digit phone number" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("id, display_name, is_pro")
      .eq("id", user.id)
      .single();

    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    if (profile.is_pro) return NextResponse.json({ error: "Already a Pro member" }, { status: 400 });

    const shortId   = user.id.slice(-8);
    const ts        = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
    const linkId    = `arenax_${shortId}_${ts}`;

    // Expiry: now + 2 hours expressed in IST
    const IST_MS    = 5.5 * 60 * 60 * 1000;
    const expiry    = new Date(Date.now() + 2 * 60 * 60 * 1000 + IST_MS);
    const expiryStr = expiry.toISOString().slice(0, 19) + "+05:30";

    const appUrl  = process.env.NEXT_PUBLIC_APP_URL ?? "https://arena.novaretalent.com";
    const isHttps = appUrl.startsWith("https://");

    // Cashfree rejects non-HTTPS return_url / notify_url — omit on localhost
    const linkMeta: Record<string, unknown> = { upi_intent: false };
    if (isHttps) {
      linkMeta.notify_url = `${appUrl}/api/payments/webhook`;
      linkMeta.return_url = `${appUrl}/dashboard?pro=processing`;
    }

    const payload = {
      customer_details: {
        customer_email: user.email ?? "",
        customer_name:  profile.display_name ?? "Warrior",
        customer_phone: phone,
      },
      link_amount:           1,
      link_auto_reminders:   false,
      link_currency:         "INR",
      link_expiry_time:      expiryStr,
      link_id:               linkId,
      link_meta:             linkMeta,
      link_notify:           { send_email: true, send_sms: false },
      link_purpose:          "ArenaX Pro Subscription",
      link_notes:            { profile_id: user.id, amount: "499" },
      link_partial_payments: false,
    };

    const res = await fetch(CASHFREE_API, {
      method:  "POST",
      headers: {
        "x-api-version":   "2025-01-01",
        "x-client-id":     process.env.CASHFREE_CLIENT_ID     ?? "",
        "x-client-secret": process.env.CASHFREE_CLIENT_SECRET ?? "",
        "Content-Type":    "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Cashfree create-link error:", err);
      return NextResponse.json({ error: "Failed to create payment link" }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json({ payment_url: data.link_url });
  } catch (e) {
    console.error("create-link error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}


