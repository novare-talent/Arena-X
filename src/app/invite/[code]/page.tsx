import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import Link from "next/link";
import Image from "next/image";
import { Swords, Trophy, ArrowRight } from "lucide-react";
import loginBgImg from "../../../../public/images/login-bg.png";
import logoImg     from "../../../../public/images/logo.png";

const BODY = "'DM Sans',system-ui,sans-serif";
const CP   = "'Copperplate Gothic 32 BC','Copperplate Gothic Bold','Copperplate',Cinzel,serif";

export default async function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const supabase  = await createClient();

  const { data: referrer } = await supabase
    .from("profiles")
    .select("username, display_name")
    .eq("referral_code", code.toUpperCase())
    .maybeSingle();

  if (referrer) {
    const service = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
    service.rpc("bump_referral_click", { p_code: code }).then(() => {}, () => {});
  }

  return (
    <div style={{ minHeight: "100vh", position: "relative", fontFamily: BODY }}>
      {/* Full-screen background */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0 }}>
        <Image src={loginBgImg} alt="" fill
          style={{ objectFit: "cover", objectPosition: "center", pointerEvents: "none", userSelect: "none" }}
          placeholder="blur" priority draggable={false} />
      </div>

      {/* Right panel */}
      <div style={{ position: "relative", zIndex: 1, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "center", padding: "40px 64px 40px 40px" }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: 28, alignSelf: "stretch" }}>
          <Image src={logoImg} alt="ArenaX" height={24} width={67}
            style={{ display: "block", pointerEvents: "none", userSelect: "none" }} draggable={false} placeholder="blur" />
        </div>

        {/* Glass card */}
        <div style={{ width: 400, background: "rgba(240,246,252,0.06)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.28)", borderRadius: 16, padding: 32 }}>
          {/* Referrer info */}
          {referrer ? (
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ width: 56, height: 56, borderRadius: 14, background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.28)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", fontFamily: CP, fontSize: 22, fontWeight: 700, color: "#0d1117" }}>
                {referrer.display_name[0]?.toUpperCase()}
              </div>
              <p style={{ fontFamily: BODY, fontSize: 12, color: "#6b7280", marginBottom: 4 }}>You were invited by</p>
              <p style={{ fontFamily: CP, fontSize: 20, fontWeight: 700, color: "#0d1117", letterSpacing: "0.04em", marginBottom: 2 }}>{referrer.display_name}</p>
              <p style={{ fontFamily: BODY, fontSize: 12, color: "#1a56db", fontWeight: 600 }}>@{referrer.username}</p>
            </div>
          ) : (
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ width: 56, height: 56, borderRadius: 14, background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.28)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                <Swords width={26} height={26} style={{ color: "#818cf8" }} />
              </div>
              <p style={{ fontFamily: BODY, fontSize: 12, color: "#6b7280" }}>You&apos;ve been invited to join</p>
            </div>
          )}

          <div style={{ fontFamily: CP, fontSize: 26, fontWeight: 700, color: "#0d1117", letterSpacing: "0.04em", marginBottom: 6, lineHeight: 1.2, textAlign: "center" }}>Join ArenaX</div>
          <p style={{ fontFamily: BODY, fontSize: 13, color: "#374151", marginBottom: 24, lineHeight: 1.5, textAlign: "center" }}>
            Compete in 1v1 coding battles, climb the ELO leaderboard, and prove your skills.
          </p>

          {/* Feature highlights */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 24 }}>
            {[
              { icon: <Swords width={16} height={16} />,  label: "1v1 Matches", color: "#6366f1" },
              { icon: <Trophy width={16} height={16} />,  label: "ELO Ranking", color: "#f5c451" },
              { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>, label: "Live Arena", color: "#22d3ee" },
            ].map(({ icon, label, color }) => (
              <div key={label} style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 10, padding: "12px 8px", textAlign: "center" }}>
                <div style={{ color, display: "flex", justifyContent: "center", marginBottom: 6 }}>{icon}</div>
                <p style={{ fontFamily: BODY, fontSize: 11, color: "#374151", fontWeight: 500 }}>{label}</p>
              </div>
            ))}
          </div>

          <Link
            href={`/signup?ref=${code.toUpperCase()}`}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", height: 42, borderRadius: 8, border: "none", background: "#238636", color: "#fff", fontFamily: BODY, fontSize: 13, fontWeight: 600, textDecoration: "none", letterSpacing: "0.02em" }}
          >
            Create your account <ArrowRight width={14} height={14} />
          </Link>

          <div style={{ textAlign: "center", marginTop: 16, fontFamily: BODY, fontSize: 12, color: "#374151" }}>
            Already have an account?{" "}
            <Link href="/login" style={{ color: "#1a56db", fontWeight: 700, textDecoration: "none" }}>Sign in</Link>
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 16, alignSelf: "stretch" }}>
          {["Privacy", "Terms", "Support"].map(l => (
            <Link key={l} href="#" style={{ fontFamily: BODY, fontSize: 11, color: "rgba(255,255,255,0.4)", textDecoration: "none" }}>{l}</Link>
          ))}
        </div>
      </div>
    </div>
  );
}
