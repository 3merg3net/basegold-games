// app/account/page.tsx
"use client";

import React, { useEffect, useMemo, useState, type FormEvent, type ChangeEvent } from "react";
import Image from "next/image";
import { useAccount } from "wagmi";
import { usePlayerProfileContext } from "@/lib/player/PlayerProfileProvider";
import { supabase } from "@/lib/supabase/client";
import CashierSwapBox from "@/components/casino/CashierSwapBox";
import { usePlayerChips } from "@/lib/chips/usePlayerChips";
import { useBalance } from "wagmi";
import { useRouter } from "next/navigation";





type StyleOption = "tight" | "loose" | "aggro" | "balanced";
type PreferredStake = "Low" | "Medium" | "High";
type FavoriteGame = "Poker" | "Blackjack" | "Slots" | "Roulette" | "Other";

const DEFAULT_AVATARS = [
  "/avatars/av-1.png",
  "/avatars/av-2.png",
  "/avatars/av-3.png",
  "/avatars/av-4.png",
  "/avatars/av-5.png",
  "/avatars/av-6.png",
];

function pickDefaultAvatar(profileId?: string) {
  // deterministic pick so it doesn't change each refresh
  const s = String(profileId || "player");
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  return DEFAULT_AVATARS[hash % DEFAULT_AVATARS.length];
}


function Pill({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "gold" | "good" | "warn";
}) {
  const cls =
    tone === "gold"
      ? "border-[#FFD700]/50 bg-[#FFD700]/10 text-[#FFE58A]"
      : tone === "good"
      ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-100"
      : tone === "warn"
      ? "border-amber-400/40 bg-amber-500/10 text-amber-100"
      : "border-white/15 bg-white/5 text-white/70";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-1 text-[10px] ${cls}`}
    >
      {label}
    </span>
  );
}

function CardShell({
  title,
  subtitle,
  children,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/12 bg-gradient-to-b from-[#020617] to-black p-4 md:p-5 shadow-[0_0_30px_rgba(0,0,0,0.35)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-white/45">
            {title}
          </div>
          {subtitle ? (
            <div className="mt-1 text-xs text-white/70">{subtitle}</div>
          ) : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function StatTile({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "neutral" | "gold" | "good";
}) {
  const valueCls =
    tone === "gold"
      ? "text-[#FFD700]"
      : tone === "good"
      ? "text-emerald-200"
      : "text-white";

  return (
    <div className="rounded-xl border border-white/10 bg-black/40 p-3">
      <div className="text-[10px] uppercase tracking-[0.25em] text-white/45">
        {label}
      </div>
      <div className={`mt-1 text-xl font-extrabold ${valueCls}`}>{value}</div>
      {sub ? <div className="mt-1 text-[11px] text-white/50">{sub}</div> : null}
    </div>
  );
}

function formatChips(n: number) {
  const v = Math.max(0, Math.floor(Number(n || 0)));
  return v.toLocaleString();
}

const CHIPS_PER_USD = 100;

// set this once you have it (or keep env-based)
const BGLD_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_BGLD_TOKEN_ADDRESS as
  | `0x${string}`
  | undefined;

function formatUsd(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

export default function AccountDashboardPage() {
  const router = useRouter();

  const {
    profile,
    updateProfile,
    chips,
    setChips,
    loading,
    error,
  } = usePlayerProfileContext() as any;


  const { address } = useAccount();

  const bgldBal = useBalance({
  address,
  token: BGLD_TOKEN_ADDRESS,
  enabled: Boolean(address && BGLD_TOKEN_ADDRESS),
  watch: true,
});

useEffect(() => {
  if (!profile?.id) return;
  // Force the app-wide "playerId" to be the real DB id.
  // This prevents FK failures on chip_balances insert/update.
  localStorage.setItem("playerId", profile.id);
}, [profile?.id]);



  useEffect(() => {
    if (loading) return;
    if (profile && !profile.isProfileComplete) {
      router.replace("/profile");
    }
  }, [loading, profile, router]);



  // Real chip balances (GLD + PGLD) from your chips system
  const {
    chips: chipState,
    loading: chipsLoading,
    error: chipsError,
    refresh: refreshChips,
  } = usePlayerChips();

  const [bgldUsd, setBgldUsd] = useState<number | null>(null);
const [bgldUsdErr, setBgldUsdErr] = useState<string | null>(null);

React.useEffect(() => {
  let alive = true;
  async function load() {
    try {
      setBgldUsdErr(null);
      const res = await fetch("/api/bgld-price", { cache: "no-store" });
      const j = await res.json().catch(() => ({}));
      const p = Number(j?.priceUsd ?? j?.usd);
      if (!alive) return;
      setBgldUsd(Number.isFinite(p) && p > 0 ? p : null);
      if (!(Number.isFinite(p) && p > 0)) setBgldUsdErr("Price unavailable");
    } catch {
      if (!alive) return;
      setBgldUsd(null);
      setBgldUsdErr("Price unavailable");
    }
  }
  void load();
  return () => {
    alive = false;
  };
}, []);


  const handle = (profile?.handle ?? "") as string;
  const nickname = (profile?.nickname ?? "") as string;
  const avatarUrl = (profile?.avatarUrl ?? "") as string;
  const avatarColor = (profile?.avatarColor ?? "#facc15") as string;
  const linkedWallet = (profile?.walletAddress ?? "") as string;
  const profileComplete = Boolean(profile?.isProfileComplete);

  const wins = Number(profile?.wins ?? 0);
  const losses = Number(profile?.losses ?? 0);
  const games = wins + losses;
  const winRate = games > 0 ? ((wins / games) * 100).toFixed(1) : "—";

  const displayName = useMemo(() => {
    const base = (nickname || handle || "").trim();
    return base || "Player";
  }, [nickname, handle]);

  const initials = useMemo(() => {
    const base = (nickname || handle || "").trim();
    if (!base) return "??";
    return base
      .split(/\s+/)
      .map((p) => p[0] ?? "")
      .join("")
      .slice(0, 3)
      .toUpperCase();
  }, [nickname, handle]);

  // Collapsible account editor
  const [openEdit, setOpenEdit] = useState(false);
  const [openIdentity, setOpenIdentity] = useState(true);
  const [openPrefs, setOpenPrefs] = useState(false);
  const [openPrivacy, setOpenPrivacy] = useState(false);

  // Local edit state (only used when editing)
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [localHandle, setLocalHandle] = useState<string>(handle);
  const [localNickname, setLocalNickname] = useState<string>(nickname);
  const [localBio, setLocalBio] = useState<string>((profile?.bio ?? "") as string);

  const [localStyle, setLocalStyle] = useState<StyleOption>(
    ((profile?.style ?? "balanced") as StyleOption) || "balanced"
  );

  const [favoriteGame, setFavoriteGame] = useState<FavoriteGame>(
    ((profile?.favoriteGame ?? "Poker") as FavoriteGame) || "Poker"
  );

  const [preferredStake, setPreferredStake] = useState<PreferredStake>(
    ((profile?.preferredStake ?? "Low") as PreferredStake) || "Low"
  );

  const [profileVisibility, setProfileVisibility] = useState<"public" | "private">(
    ((profile?.profileVisibility ?? "public") as "public" | "private") || "public"
  );

  const [showBalancesPublic, setShowBalancesPublic] = useState<boolean>(
    Boolean(profile?.showBalancesPublic)
  );

  const [localAvatarColor, setLocalAvatarColor] = useState<string>(avatarColor);

  // Avatar upload
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  // Wallet link
  const [walletLinking, setWalletLinking] = useState(false);
  const [walletLinkError, setWalletLinkError] = useState<string | null>(null);
  const [walletLinkSuccess, setWalletLinkSuccess] = useState<string | null>(null);







  function startEdit() {
    setLocalHandle(handle);
    setLocalNickname(nickname);
    setLocalBio((profile?.bio ?? "") as string);
    setLocalStyle(((profile?.style ?? "balanced") as StyleOption) || "balanced");
    setFavoriteGame(((profile?.favoriteGame ?? "Poker") as FavoriteGame) || "Poker");
    setPreferredStake(((profile?.preferredStake ?? "Low") as PreferredStake) || "Low");
    setProfileVisibility(
      ((profile?.profileVisibility ?? "public") as "public" | "private") || "public"
    );
    setShowBalancesPublic(Boolean(profile?.showBalancesPublic));
    setLocalAvatarColor((profile?.avatarColor ?? "#facc15") as string);

    setSaveError(null);
    setOpenEdit(true);
  }

  async function saveEdits(e: FormEvent) {
    e.preventDefault();
    setSaveError(null);

    const h = localHandle.trim();
    if (!h) {
      setSaveError("Handle is required.");
      return;
    }

    setSaving(true);
    try {
      await updateProfile({
        handle: h,
        nickname: localNickname.trim(),
        bio: localBio,
        style: localStyle,
        favoriteGame,
        preferredStake,
        profileVisibility,
        showBalancesPublic,
        avatarColor: localAvatarColor,
        avatarInitials: initials,
        isProfileComplete: true,
      } as any);

      setOpenEdit(false);
    } catch (err: any) {
      const msg = String(err?.message || "");
      if (msg.toLowerCase().includes("players_handle_key")) {
        setSaveError("That handle is already taken.");
      } else {
        setSaveError(err?.message ?? "Failed to save changes.");
      }
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
  if (loading) return;
  if (!profile?.id) return;

  // If user has no avatarUrl yet, set a default once
  if (!profile.avatarUrl) {
    void updateProfile({ avatarUrl: pickDefaultAvatar(profile.id) } as any);
  }
}, [loading, profile?.id, profile?.avatarUrl, updateProfile]);


  async function handleAvatarChange(e: ChangeEvent<HTMLInputElement>) {
    setAvatarError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!profile?.id) {
      setAvatarError("Profile not ready yet.");
      return;
    }

    try {
      setAvatarUploading(true);

      const bucket = "poker-avatars";
      const ext = file.name.split(".").pop() || "png";
      const uid =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : Math.random().toString(36).slice(2);

      const path = `${profile.id}/${uid}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, file, { cacheControl: "3600", upsert: true });

      if (uploadError) {
        console.error(uploadError);
        setAvatarError("Upload failed. Try a smaller image.");
        return;
      }

      const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(path);
      const publicUrl = publicUrlData?.publicUrl;

      if (!publicUrl) {
        setAvatarError("Could not resolve public URL.");
        return;
      }

      await updateProfile({ avatarUrl: publicUrl } as any);
    } catch (err) {
      console.error(err);
      setAvatarError("Unexpected error uploading avatar.");
    } finally {
      setAvatarUploading(false);
    }
  }

  async function handleLinkWallet() {
    setWalletLinkError(null);
    setWalletLinkSuccess(null);

    if (!profile?.id) {
      setWalletLinkError("Profile not ready yet.");
      return;
    }
    if (!address) {
      setWalletLinkError("Connect a wallet in the header first.");
      return;
    }

    try {
      setWalletLinking(true);
      await updateProfile({ walletAddress: address } as any);
      setWalletLinkSuccess("Wallet linked.");
    } catch (err: any) {
      console.error(err);
      setWalletLinkError(err?.message ?? "Failed to link wallet.");
    } finally {
      setWalletLinking(false);
    }
  }

  // Chip balances
  const gldBal = chipState?.balance_gld ?? 0;
  const gldRes = chipState?.reserved_gld ?? 0;
  const pgldBal = chipState?.balance_pgld ?? 0;
  const pgldRes = chipState?.reserved_pgld ?? 0;

  const gldUsd = gldBal / CHIPS_PER_USD;
const pgldUsd = pgldBal / CHIPS_PER_USD;

// reserved reduces “playable”
const playableGld = Math.max(0, gldBal - gldRes);
const playablePgld = Math.max(0, pgldBal - pgldRes);

const playableUsd = (playableGld + playablePgld) / CHIPS_PER_USD;

// BGLD wallet value (best-effort)
const bgldTokenFloat = bgldBal.data ? Number(bgldBal.data.formatted) : 0;
const bgldValueUsd = bgldUsd ? bgldTokenFloat * bgldUsd : null;

// Total “net worth” shown = chips USD + bgld wallet USD (if known)
const chipWorthUsd = gldUsd + pgldUsd;
const totalWorthUsd = bgldValueUsd != null ? chipWorthUsd + bgldValueUsd : null;

useEffect(() => {
  if (loading) return;
  if (profile && !profile.isProfileComplete) {
    router.replace("/profile");
  }
}, [loading, profile, router]);

useEffect(() => {
  if (!profile?.id) return
  console.log("[ACCOUNT] profile.id:", profile.id)
  try {
    console.log("[ACCOUNT] localStorage playerId:", localStorage.getItem("playerId"))
  } catch {}
}, [profile?.id])



  // Uniswap link (you can swap this to your exact pool / token URL later)
  const uniswapBgldUrl = "https://app.uniswap.org/swap?chain=base&outputCurrency=0x0bbcaa0921da25ef216739e8dbbfd988875e81b4"; // placeholder

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-[#020617] to-black text-white">
      <div className="mx-auto max-w-6xl px-4 py-8 md:py-10 space-y-6">
        {/* Top header */}
        <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.32em] text-white/45">
              BGRC Casino • Account
            </div>

            <h1 className="mt-1 text-2xl md:text-3xl font-extrabold tracking-tight">
              {displayName}
            </h1>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Pill
                label={profileComplete ? "Profile complete" : "Setup needed"}
                tone={profileComplete ? "good" : "warn"}
              />
              <Pill label={`Handle: ${handle || "—"}`} tone="gold" />
              <Pill label={`Stake: ${preferredStake}`} />
              <Pill label={`Game: ${favoriteGame}`} />
              <Pill
                label={chipsLoading ? "Balances syncing…" : "Balances live"}
                tone={chipsLoading ? "warn" : "good"}
              />
            </div>

           {(loading || chipsLoading) && (
  <div className="mt-3 text-[11px] text-white/55">
    Syncing your account state…
  </div>
)}
<div className="flex items-center gap-2">
  <button
    type="button"
    onClick={() => router.push("/profile")}
    className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/10"
  >
    Edit Profile
  </button>

  <button
    type="button"
    onClick={() => router.push("/poker")}
    className="rounded-xl border border-[#FFD700]/35 bg-[#FFD700]/10 px-3 py-2 text-xs font-extrabold text-[#FFE58A] hover:bg-[#FFD700]/15"
  >
    Poker Lobby →
  </button>
</div>


          </div>

          <div className="flex items-center gap-3">
            <div
              className="h-12 w-12 rounded-full overflow-hidden border border-[#FFD700]/50 shadow-[0_0_24px_rgba(250,204,21,0.25)] flex items-center justify-center text-black font-extrabold"
              style={{ backgroundColor: avatarColor }}
            >
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt="Avatar"
                  width={48}
                  height={48}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span>{initials}</span>
              )}
            </div>

            <button
              type="button"
              onClick={startEdit}
              className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/10"
            >
              Account Settings
            </button>
          </div>
        </header>

        {(error || chipsError) && (
  <div className="rounded-2xl border border-red-500/30 bg-red-950/30 p-4 text-sm text-red-200 space-y-1">
    {error ? <div>Error loading profile: {String(error)}</div> : null}
    {chipsError ? <div>Chips error: {String(chipsError)}</div> : null}
  </div>
)}


        {/* Net Worth Strip */}
<section className="rounded-2xl border border-white/12 bg-black/50 p-4 md:p-5 shadow-[0_0_30px_rgba(0,0,0,0.35)]">
  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
    <div>
      <div className="text-[10px] uppercase tracking-[0.28em] text-white/45">
        Account Overview
      </div>
      <div className="mt-1 text-sm text-white/70">
        Chips are priced at 100 = $1. Reserved is locked in active games.
      </div>
    </div>

    <div className="flex flex-wrap gap-2">
      <Pill
        label={
          bgldUsd
            ? `BGLD/USD: $${bgldUsd.toFixed(6)}`
            : bgldUsdErr
            ? `BGLD/USD: —`
            : "BGLD/USD: …"
        }
        tone={bgldUsd ? "good" : "warn"}
      />
      <Pill label={`Playable: ${formatUsd(playableUsd)}`} tone="gold" />
      <Pill
        label={
          totalWorthUsd != null ? `Total: ${formatUsd(totalWorthUsd)}` : "Total: —"
        }
        tone={totalWorthUsd != null ? "good" : "neutral"}
      />
    </div>
  </div>

  <div className="mt-4 grid gap-3 md:grid-cols-4">
    <StatTile label="GLD Value" value={formatUsd(gldUsd)} sub={`GLD: ${formatChips(gldBal)}`} tone="gold" />
    <StatTile label="PGLD Value" value={formatUsd(pgldUsd)} sub={`PGLD: ${formatChips(pgldBal)}`} />
    <StatTile
      label="BGLD Wallet"
      value={
        address && BGLD_TOKEN_ADDRESS
          ? bgldBal.isLoading
            ? "Loading…"
            : bgldBal.data
            ? `${bgldTokenFloat.toLocaleString(undefined, { maximumFractionDigits: 6 })} BGLD`
            : "—"
          : "—"
      }
      sub={
        bgldValueUsd != null ? `≈ ${formatUsd(bgldValueUsd)}` : "USD value unavailable"
      }
      tone={bgldValueUsd != null ? "good" : "neutral"}
    />
    <StatTile
      label="Reserved (Locked)"
      value={formatUsd((gldRes + pgldRes) / CHIPS_PER_USD)}
      sub={`GLD ${formatChips(gldRes)} • PGLD ${formatChips(pgldRes)}`}
    />
  </div>
</section>


        {/* Row 1: Balances + Wallet + Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <CardShell
            title="Balances"
            subtitle="GLD powers the casino. PGLD is poker-only."
            right={
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => refreshChips()}
                  className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-[11px] font-semibold text-white/75 hover:bg-white/10"
                >
                  Refresh
                </button>
                <Pill label={chipsLoading ? "Syncing…" : "Live"} tone={chipsLoading ? "warn" : "good"} />
              </div>
            }
          >
            <div className="grid gap-3">
              <StatTile
                label="GLD (Casino Chips)"
                value={formatChips(gldBal)}
                sub={`Reserved: ${formatChips(gldRes)}`}
                tone="gold"
              />
              <StatTile
                label="PGLD (Poker Chips)"
                value={formatChips(pgldBal)}
                sub={`Reserved: ${formatChips(pgldRes)}`}
                tone="neutral"
              />
              <div className="rounded-xl border border-white/10 bg-black/40 p-3">
                <div className="text-[10px] uppercase tracking-[0.25em] text-white/45">
                  BGLD (Token)
                </div>
                <div className="mt-1 text-xs text-white/70">
                  Use BGLD to buy chips in the Cashier. On-chain balance display can be added next.
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <a
                    href={uniswapBgldUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-xl border border-[#FFD700]/35 bg-[#FFD700]/10 px-3 py-2 text-center text-xs font-extrabold text-[#FFE58A] hover:bg-[#FFD700]/15"
                  >
                    Buy BGLD (Uniswap)
                  </a>
                  <button
                    type="button"
                    onClick={() => refreshChips()}
                    className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white/75 hover:bg-white/10"
                  >
                    Update balances
                  </button>
                </div>
              </div>
            </div>
          </CardShell>

          <CardShell title="Wallet" subtitle="Connected + linked identity">
            <div className="space-y-3">
              <div className="rounded-xl border border-white/10 bg-black/40 p-3">
                <div className="text-[10px] uppercase tracking-[0.25em] text-white/45">
                  Connected
                </div>
                <div className="mt-1 font-mono text-xs text-white/80">
                  {address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "Not connected"}
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/40 p-3">
                <div className="text-[10px] uppercase tracking-[0.25em] text-white/45">
                  Linked
                </div>
                <div className="mt-1 font-mono text-xs text-white/80">
                  {linkedWallet ? `${linkedWallet.slice(0, 6)}…${linkedWallet.slice(-4)}` : "Not linked"}
                </div>

                <button
                  type="button"
                  onClick={handleLinkWallet}
                  disabled={walletLinking}
                  className="mt-3 w-full rounded-xl border border-sky-300/40 bg-sky-500/10 px-3 py-2 text-xs font-semibold text-sky-100 hover:bg-sky-500/15 disabled:opacity-50"
                >
                  {walletLinking ? "Linking…" : "Link current wallet"}
                </button>

                {walletLinkError ? (
                  <div className="mt-2 text-[11px] text-red-300">{walletLinkError}</div>
                ) : null}
                {walletLinkSuccess ? (
                  <div className="mt-2 text-[11px] text-emerald-300">{walletLinkSuccess}</div>
                ) : null}
              </div>

              <div className="rounded-xl border border-white/10 bg-black/40 p-3">
                <div className="text-[10px] uppercase tracking-[0.25em] text-white/45">
                  Account ID
                </div>
                <div className="mt-1 font-mono text-[11px] text-white/75">
                  {profile?.id ? String(profile.id).slice(0, 10) + "…" : "—"}
                </div>
              </div>
            </div>
          </CardShell>

          <CardShell title="Player Stats" subtitle="Early access tracking (expands later)">
            <div className="grid grid-cols-2 gap-3">
              <StatTile label="Games" value={String(games)} />
              <StatTile
                label="Win rate"
                value={winRate === "—" ? "—" : `${winRate}%`}
                tone="gold"
              />
              <div className="col-span-2 rounded-xl border border-white/10 bg-black/40 p-3">
                <div className="text-[10px] uppercase tracking-[0.25em] text-white/45">
                  Tracking roadmap
                </div>
                <div className="mt-1 text-xs text-white/65">
                  Volume, ROI, hands played, lifetime winnings, game-specific leaderboards, seasonal rewards.
                </div>
              </div>
            </div>
          </CardShell>
        </div>

        {/* Row 2: Cashier + Activity/Settings */}
        <div className="grid gap-4 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <CardShell
            title="Cashier"
            subtitle="Swap BGLD ⇄ GLD / PGLD (preview). Settlement wiring comes next."
            right={<Pill label="Preview" tone="warn" />}
          >
            <CashierSwapBox
  playerId={profile?.id}
  balances={{ gld: gldBal, pgld: pgldBal }}
  onBalances={(next) => {
    // optional immediate UI optimism; real truth comes from refreshChips()
    // you can also just call refreshChips() here if you prefer
    refreshChips();
  }}
/>



            <div className="mt-3 rounded-xl border border-white/10 bg-black/40 p-3 text-[11px] text-white/60">
              GLD is the main casino currency for all non-poker games. PGLD is poker-only.
              Reserved balances represent chips locked in active games/sessions.
            </div>
          </CardShell>

          <CardShell
            title="Account Settings"
            subtitle="Collapsed by default — keep gameplay focused"
            right={
              <button
                type="button"
                onClick={() => setOpenEdit((v) => !v)}
                className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/10"
              >
                {openEdit ? "Close" : "Open"}
              </button>
            }
          >
            {!openEdit ? (
              <div className="rounded-xl border border-white/10 bg-black/40 p-4 text-xs text-white/65">
                Keep this closed during gameplay. Open to edit profile, preferences, privacy, and avatar.
              </div>
            ) : (
              <form onSubmit={saveEdits} className="space-y-3">
                {/* Identity */}
                <div className="rounded-xl border border-white/10 bg-black/40">
                  <button
                    type="button"
                    onClick={() => setOpenIdentity((v) => !v)}
                    className="w-full flex items-center justify-between px-4 py-3"
                  >
                    <div className="text-left">
                      <div className="text-[10px] uppercase tracking-[0.25em] text-white/45">
                        Identity
                      </div>
                      <div className="text-sm font-semibold text-white/85">
                        Handle + avatar
                      </div>
                    </div>
                    <span className="text-xs text-white/60">
                      {openIdentity ? "Hide" : "Edit"}
                    </span>
                  </button>

                  {openIdentity ? (
                    <div className="px-4 pb-4 space-y-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="block text-xs text-white/60 mb-1">
                            Handle <span className="text-[#FFD700]">(required)</span>
                          </label>
                          <input
                            value={localHandle}
                            onChange={(e) => setLocalHandle(e.target.value)}
                            className="w-full rounded-lg bg-black/60 border border-white/20 px-3 py-2 text-sm outline-none focus:border-[#FFD700]"
                            placeholder="Ex: GoldRushGrinder"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-white/60 mb-1">
                            Nickname (optional)
                          </label>
                          <input
                            value={localNickname}
                            onChange={(e) => setLocalNickname(e.target.value)}
                            className="w-full rounded-lg bg-black/60 border border-white/20 px-3 py-2 text-sm outline-none focus:border-[#FFD700]"
                            placeholder="Ex: River King"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs text-white/60 mb-1">Bio</label>
                        <textarea
                          value={localBio}
                          onChange={(e) => setLocalBio(e.target.value)}
                          className="w-full rounded-lg bg-black/60 border border-white/20 px-3 py-2 text-[11px] outline-none focus:border-[#FFD700] min-h-[70px]"
                          placeholder="One or two lines…"
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="text-xs text-white/60">Avatar upload</div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarChange}
                          className="text-[11px] file:mr-2 file:rounded-md file:border-0 file:bg-[#FFD700] file:px-2 file:py-1 file:text-xs file:font-semibold file:text-black file:hover:bg-yellow-400"
                        />
                        {avatarUploading ? (
                          <div className="text-[11px] text-amber-300">Uploading…</div>
                        ) : null}
                        {avatarError ? (
                          <div className="text-[11px] text-red-300">{avatarError}</div>
                        ) : null}
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <div className="text-xs text-white/60">Avatar color</div>
                        <input
                          type="color"
                          value={localAvatarColor}
                          onChange={(e) => setLocalAvatarColor(e.target.value)}
                          className="h-9 w-12 rounded-md border border-white/30 bg-transparent"
                        />
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* Preferences */}
                <div className="rounded-xl border border-white/10 bg-black/40">
                  <button
                    type="button"
                    onClick={() => setOpenPrefs((v) => !v)}
                    className="w-full flex items-center justify-between px-4 py-3"
                  >
                    <div className="text-left">
                      <div className="text-[10px] uppercase tracking-[0.25em] text-white/45">
                        Preferences
                      </div>
                      <div className="text-sm font-semibold text-white/85">
                        Style + stakes
                      </div>
                    </div>
                    <span className="text-xs text-white/60">
                      {openPrefs ? "Hide" : "Edit"}
                    </span>
                  </button>

                  {openPrefs ? (
                    <div className="px-4 pb-4 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-white/60 mb-1">Style</label>
                          <select
                            value={localStyle}
                            onChange={(e) => setLocalStyle(e.target.value as StyleOption)}
                            className="w-full rounded-lg bg-black/60 border border-white/20 px-2.5 py-2 text-sm outline-none focus:border-[#FFD700]"
                          >
                            <option value="tight">Tight</option>
                            <option value="loose">Loose</option>
                            <option value="aggro">Aggressive</option>
                            <option value="balanced">Balanced</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs text-white/60 mb-1">
                            Favorite game
                          </label>
                          <select
                            value={favoriteGame}
                            onChange={(e) => setFavoriteGame(e.target.value as FavoriteGame)}
                            className="w-full rounded-lg bg-black/60 border border-white/20 px-2.5 py-2 text-sm outline-none focus:border-[#FFD700]"
                          >
                            <option value="Poker">Poker</option>
                            <option value="Blackjack">Blackjack</option>
                            <option value="Slots">Slots</option>
                            <option value="Roulette">Roulette</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-xs text-white/60 mb-1">
                            Preferred stakes
                          </label>
                          <select
                            value={preferredStake}
                            onChange={(e) => setPreferredStake(e.target.value as PreferredStake)}
                            className="w-full rounded-lg bg-black/60 border border-white/20 px-2.5 py-2 text-sm outline-none focus:border-[#FFD700]"
                          >
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* Privacy */}
                <div className="rounded-xl border border-white/10 bg-black/40">
                  <button
                    type="button"
                    onClick={() => setOpenPrivacy((v) => !v)}
                    className="w-full flex items-center justify-between px-4 py-3"
                  >
                    <div className="text-left">
                      <div className="text-[10px] uppercase tracking-[0.25em] text-white/45">
                        Privacy
                      </div>
                      <div className="text-sm font-semibold text-white/85">
                        Visibility + balances
                      </div>
                    </div>
                    <span className="text-xs text-white/60">
                      {openPrivacy ? "Hide" : "Edit"}
                    </span>
                  </button>

                  {openPrivacy ? (
                    <div className="px-4 pb-4 space-y-3">
                      <label className="flex items-center gap-2 text-xs text-white/75">
                        <input
                          type="checkbox"
                          checked={showBalancesPublic}
                          onChange={(e) => setShowBalancesPublic(e.target.checked)}
                          className="h-3 w-3 rounded border-white/40 bg-black"
                        />
                        Show balances publicly (later)
                      </label>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setProfileVisibility("public")}
                          className={`flex-1 rounded-xl border px-3 py-2 text-xs font-semibold ${
                            profileVisibility === "public"
                              ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-100"
                              : "border-white/15 bg-white/5 text-white/70"
                          }`}
                        >
                          Public
                        </button>
                        <button
                          type="button"
                          onClick={() => setProfileVisibility("private")}
                          className={`flex-1 rounded-xl border px-3 py-2 text-xs font-semibold ${
                            profileVisibility === "private"
                              ? "border-white/40 bg-white/10 text-white"
                              : "border-white/15 bg-white/5 text-white/70"
                          }`}
                        >
                          Private
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>

                {saveError ? (
                  <div className="rounded-xl border border-red-500/30 bg-red-950/30 p-3 text-xs text-red-200">
                    {saveError}
                  </div>
                ) : null}

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 rounded-xl bg-[#FFD700] px-4 py-2 text-sm font-extrabold text-black hover:bg-yellow-400 disabled:opacity-50"
                  >
                    {saving ? "Saving…" : "Save Changes"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpenEdit(false)}
                    className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white/75 hover:bg-white/10"
                  >
                    Close
                  </button>
                </div>
              </form>
            )}
          </CardShell>
        </div>
      </div>
    </main>
  );
}
