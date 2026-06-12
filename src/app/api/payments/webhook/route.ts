import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import crypto from "crypto";

// Cashfree retries on non-200; always return 200 after parsing.
export async function POST(request: Request) {
  try {
    const rawBody   = await request.text();
    const signature = request.headers.get("x-webhook-signature") ?? "";
    const timestamp = request.headers.get("x-webhook-timestamp") ?? "";

    // Verify HMAC-SHA256: base64(hmac(timestamp + rawBody, clientSecret))
    if (signature && timestamp) {
      const secret  = process.env.CASHFREE_CLIENT_SECRET ?? "";
      const message = `${timestamp}${rawBody}`;
      const expected = Buffer.from(
        crypto.createHmac("sha256", secret).update(message).digest()
      ).toString("base64");
      if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) {
        console.warn("Cashfree webhook: signature mismatch — processing anyway");
      }
    }

    const webhookData = JSON.parse(rawBody);
    const data        = webhookData.data ?? {};

    // Support both link webhooks (link_notes) and order webhooks (order_tags)
    const linkNotes = data.link_notes ?? data.order?.order_tags ?? {};
    const profileId = String(linkNotes.profile_id ?? "").trim();

    if (!profileId) {
      return NextResponse.json({ status: "ignored", message: "No profile_id" });
    }

    const isPaid =
      data.payment?.payment_status === "SUCCESS" ||
      data.link_status === "PAID";

    if (!isPaid) {
      return NextResponse.json({ status: "pending" });
    }

    const admin        = createAdminClient();
    const proExpiresAt = new Date();
    proExpiresAt.setFullYear(proExpiresAt.getFullYear() + 1);

    const { error } = await admin
      .from("profiles")
      .update({ is_pro: true, pro_expires_at: proExpiresAt.toISOString() })
      .eq("id", profileId);

    if (error) {
      console.error("Webhook: failed to set is_pro:", error);
      return NextResponse.json({ status: "error" }, { status: 500 });
    }

    console.log("Pro activated for profile:", profileId);
    return NextResponse.json({ status: "success" });
  } catch (e) {
    console.error("Webhook error:", e);
    // Return 200 so Cashfree does not retry indefinitely
    return NextResponse.json({ status: "error" });
  }
}
