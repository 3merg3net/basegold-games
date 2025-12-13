// app/profile/page.tsx
"use client";

import { useEffect, useMemo, useState, ChangeEvent, FormEvent } from "react";
import Image from "next/image";
import { useAccount } from "wagmi";
import { usePlayerProfileContext } from "@/lib/player/PlayerProfileProvider";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const LOCAL_STORAGE_PLAYER_ID_KEY = "bgld_player_id"; // kept for backward compat
const RETURN_TO_KEY = "bgrc_return_to";

type StyleOption = "tight" | "loose" | "aggro" | "balanced";
type PreferredStake = "Low" | "Medium" | "High";
type FavoriteGame = "Poker" | "Blackjack" | "Slots" | "Roulette" | "Other";

export default function CasinoProfilePage() {
  const { profile, updateProfile, loading, error } = usePlayerProfileContext() as any;
  const { address } = useAccount();
  const router = useRouter();

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const [walletLinking, setWalletLinking] = useState(false);
  const [walletLinkError, setWalletLinkError] = useState<string | null>(null);
  const [walletLinkSuccess, setWalletLinkSuccess] = useState<string | null>(null);

  // local form state
  const [localHandle, setLocalHandle] = useState("");
  const [localNickname, setLocalNickname] = useState(""); // stored in DB "name"
  const [localBio, setLocalBio] = useState("");
  const [localStyle, setLocalStyle] = useState<StyleOption>("balanced");
  const [localTwitter, setLocalTwitter] = useState("");
  const [localTelegram, setLocalTelegram] = useState("");
  const [localAvatarColor, setLocalAvatarColor] = useState("#facc15");

  const [favoriteGame, setFavoriteGame] = useState<FavoriteGame>("Poker");
  const [preferredStake, setPreferredStake] = useState<PreferredStake>("Low");
  const [profileVisibility, setProfileVisibility] = useState<"public" | "private">("public");
  const [showBalancesPublic, setShowBalancesPublic] = useState(false);

  // cross-device profile id import
  const [importId, setImportId] = useState("");
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const avatarUrl = (profile as any)?.avatarUrl as string | undefined;
  const profileId = (profile as any)?.id as string | undefined;
  const linkedWallet = (profile as any)?.walletAddress as string | undefined;
  const profileComplete = (profile as any)?.isProfileComplete as boolean | undefined;

  // a few basic stats from existing fields (safe)
  const wins = Number(profile?.wins ?? 0);
  const losses = Number(profile?.losses ?? 0);
  const games = wins + losses;
  const winRate = games > 0 ? ((wins / games) * 100).toFixed(1) : "—";

  useEffect(() => {
    if (!profile) return;

    setLocalHandle((profile.handle as string) ?? "");
    setLocalNickname((profile.nickname as string) ?? "");
    setLocalBio(profile.bio ?? "");
    setLocalStyle((profile.style as StyleOption) ?? "balanced");
    setLocalTwitter((profile.twitter as string) ?? "");
    setLocalTelegram((profile.telegram as string) ?? "");
    setLocalAvatarColor(profile.avatarColor ?? "#facc15");

    setFavoriteGame((profile.favoriteGame as FavoriteGame) ?? "Poker");
    setPreferredStake((profile.preferredStake as PreferredStake) ?? "Low");
    setProfileVisibility((profile.profileVisibility as "public" | "private") ?? "public");
    setShowBalancesPublic(typeof profile.showBalancesPublic === "boolean" ? profile.showBalancesPublic : false);
  }, [profile]);

  const initials = useMemo(() => {
    const base = (localNickname.trim() || localHandle.trim());
    if (!base) return "??";
    return base
      .split(/\s+/)
      .map((p) => p[0] ?? "")
      .join("")
      .slice(0, 3)
      .toUpperCase();
  }, [localNickname, localHandle]);

  // Demo completion rule: HANDLE ONLY
  const isLocallyComplete = useMemo(() => {
    return Boolean(localHandle.trim());
  }, [localHandle]);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!profile) return;

    const handle = localHandle.trim();

    if (!handle) {
      setSaveError("Casino handle is required before you can continue.");
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      await updateProfile({
        handle,
        nickname: localNickname.trim(), // optional (stored in DB "name")
        bio: localBio,
        style: localStyle,

        twitter: localTwitter,
        telegram: localTelegram,

        avatarColor: localAvatarColor,
        avatarInitials: initials,

        favoriteGame,
        preferredStake,
        profileVisibility,
        showBalancesPublic,

        isProfileComplete: isLocallyComplete,
      } as any);

      const rt =
        typeof window !== "undefined"
          ? window.localStorage.getItem(RETURN_TO_KEY)
          : null;

      if (typeof window !== "undefined") {
        window.localStorage.removeItem(RETURN_TO_KEY);
      }

      router.push(rt || "/live-tables");
    } catch (err: any) {
      console.error("[profile] save error", err);
      const msg = String(err?.message || "");
      if (msg.toLowerCase().includes("players_handle_key")) {
        setSaveError("That handle is already taken. Try a different one.");
      } else {
        setSaveError(err?.message ?? "Failed to save profile. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarChange(e: ChangeEvent<HTMLInputElement>) {
    setAvatarError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!profile?.id) {
      setAvatarError("Save your profile first, then upload an avatar.");
      return;
    }

    try {
      setAvatarUploading(true);

      // keep existing bucket name if that's what you already have
      const bucket = "poker-avatars";
      const ext = file.name.split(".").pop() || "png";
      const path = `${profile.id}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, file, { cacheControl: "3600", upsert: true });

      if (uploadError) {
        console.error(uploadError);
        setAvatarError("Upload failed. Try a smaller image or different file.");
        return;
      }

      const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(path);
      const publicUrl = publicUrlData?.publicUrl;

      if (!publicUrl) {
        setAvatarError("Could not resolve public URL for avatar.");
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

  function handleImportProfileId(e: FormEvent) {
    e.preventDefault();
    setImportStatus(null);

    const trimmed = importId.trim();
    if (!trimmed) return;

    try {
      localStorage.setItem(LOCAL_STORAGE_PLAYER_ID_KEY, trimmed);
      setImportStatus("Profile ID applied. Reloading this browser to sync…");
      setTimeout(() => window.location.reload(), 600);
    } catch (err) {
      console.error(err);
      setImportStatus("Could not apply Profile ID in this browser.");
    }
  }

  async function handleLinkWallet() {
    setWalletLinkError(null);
    setWalletLinkSuccess(null);

    if (!profile?.id) {
      setWalletLinkError("Save your profile first, then link a wallet.");
      return;
    }
    if (!address) {
      setWalletLinkError("Connect a wallet in the header first, then link it here.");
      return;
    }

    try {
      setWalletLinking(true);
      await updateProfile({ walletAddress: address } as any);
      setWalletLinkSuccess("Wallet linked to this Casino ID.");
    } catch (err: any) {
      console.error(err);
      setWalletLinkError(err?.message ?? "Failed to link wallet. Try again.");
    } finally {
      setWalletLinking(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-[#020617] to-black text-white">
      <section className="mx-auto max-w-5xl px-4 py-8 md:py-10 space-y-6">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-white/50">
              Base Gold Rush Casino • Global Casino ID
            </div>
            <h1 className="mt-1 text-2xl md:text-3xl font-extrabold tracking-tight">
              Player Identity &amp; Casino Profile
            </h1>
            <p className="mt-2 text-sm text-white/70 max-w-xl">
              Your single identity across every Base Gold Rush Casino experience. Handle, avatar, preferences,
              and privacy live here. Demo requires a handle only.
            </p>
          </div>

          <div className="flex flex-col items-start md:items-end gap-2 text-xs text-white/55">
            {loading ? (
              <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-1 border border-amber-500/40">
                <span className="mr-1 h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                Loading profile…
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-1 border border-emerald-500/40">
                <span className="mr-1 h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                {profileComplete ? "Casino ID complete" : "Casino ID draft saved"}
              </span>
            )}

            {error && (
              <div className="mt-1 text-[11px] text-red-400">
                Error loading profile: {String(error)}
              </div>
            )}
          </div>
        </header>

        <div className="grid gap-6 md:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
          {/* Left: GCID core panel */}
          <form
            onSubmit={handleSave}
            className="space-y-4 rounded-2xl border border-white/15 bg-gradient-to-b from-[#020617] to-black p-4 md:p-5"
          >
            {/* Avatar */}
            <div className="flex gap-4 items-center border-b border-white/10 pb-4 mb-2">
              <div className="relative">
                <div
                  className="h-20 w-20 md:h-24 md:w-24 rounded-full flex items-center justify-center text-xl md:text-2xl font-bold text-black shadow-[0_0_32px_rgba(250,204,21,0.7)] overflow-hidden border border-[#FFD700]/60"
                  style={{ backgroundColor: localAvatarColor }}
                >
                  {avatarUrl ? (
                    <Image
                      src={avatarUrl}
                      alt="Avatar"
                      height={96}
                      width={96}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span>{initials}</span>
                  )}
                </div>
                <div className="mt-2 text-[10px] text-white/50">
                  Avatar shown across the casino
                </div>
              </div>

              <div className="flex-1 space-y-2 text-[11px]">
                <div className="font-semibold text-white/80">Upload avatar</div>
                <p className="text-white/55">
                  Choose a square-ish image (JPG/PNG). Stored in Supabase Storage and rendered on tables,
                  leaderboards, and profile cards.
                </p>
                <div className="flex flex-col gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="text-[11px] file:mr-2 file:rounded-md file:border-0 file:bg-[#FFD700] file:px-2 file:py-1 file:text-xs file:font-semibold file:text-black file:hover:bg-yellow-400"
                  />
                  {avatarUploading && (
                    <div className="text-[11px] text-amber-300">Uploading avatar…</div>
                  )}
                  {avatarError && (
                    <div className="text-[11px] text-red-400">{avatarError}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Core identity */}
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs text-white/60 mb-1">
                    Casino handle <span className="text-[#FFD700]">(required)</span>
                  </label>
                  <input
                    value={localHandle}
                    onChange={(e) => setLocalHandle(e.target.value)}
                    className="w-full rounded-lg bg-black/60 border border-white/20 px-3 py-2 text-sm outline-none focus:border-[#FFD700]"
                    placeholder="Ex: IM_M3, GoldRushGrinder…"
                  />
                  <p className="mt-1 text-[11px] text-white/45">
                    Your global name across Base Gold Rush Casino. Shown on leaderboards and public profile cards.
                  </p>
                </div>

                <div>
                  <label className="block text-xs text-white/60 mb-1">
                    Nickname <span className="text-white/45">(optional)</span>
                  </label>
                  <input
                    value={localNickname}
                    onChange={(e) => setLocalNickname(e.target.value)}
                    className="w-full rounded-lg bg-black/60 border border-white/20 px-3 py-2 text-sm outline-none focus:border-[#FFD700]"
                    placeholder="Ex: River King, GG Grinder, BasedDegen…"
                  />
                  <p className="mt-1 text-[11px] text-white/45">
                    Optional display name for chat/rails. Your handle remains your primary casino identity.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs text-white/60 mb-1">Bio</label>
                <textarea
                  value={localBio}
                  onChange={(e) => setLocalBio(e.target.value)}
                  className="w-full rounded-lg bg-black/60 border border-white/20 px-3 py-2 text-[11px] outline-none focus:border-[#FFD700] min-h-[70px]"
                  placeholder="One or two lines about your vibe…"
                />
              </div>

              {/* Preferences */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-white/60 mb-1">Style (optional)</label>
                  <select
                    value={localStyle}
                    onChange={(e) => setLocalStyle(e.target.value as StyleOption)}
                    className="w-full rounded-lg bg-black/60 border border-white/20 px-2.5 py-1.5 text-[11px] outline-none focus:border-[#FFD700]"
                  >
                    <option value="tight">Tight</option>
                    <option value="loose">Loose</option>
                    <option value="aggro">Aggressive</option>
                    <option value="balanced">Balanced</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-white/60 mb-1">Favorite game</label>
                  <select
                    value={favoriteGame}
                    onChange={(e) => setFavoriteGame(e.target.value as FavoriteGame)}
                    className="w-full rounded-lg bg-black/60 border border-white/20 px-2.5 py-1.5 text-[11px] outline-none focus:border-[#FFD700]"
                  >
                    <option value="Poker">Poker</option>
                    <option value="Blackjack">Blackjack</option>
                    <option value="Slots">Slots</option>
                    <option value="Roulette">Roulette</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-white/60 mb-1">Preferred stakes</label>
                  <select
                    value={preferredStake}
                    onChange={(e) => setPreferredStake(e.target.value as PreferredStake)}
                    className="w-full rounded-lg bg-black/60 border border-white/20 px-2.5 py-1.5 text-[11px] outline-none focus:border-[#FFD700]"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>

              {/* Socials + balances toggle */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-white/60 mb-1">X / Twitter (optional)</label>
                  <input
                    value={localTwitter}
                    onChange={(e) => setLocalTwitter(e.target.value)}
                    className="w-full rounded-lg bg-black/60 border border-white/20 px-2.5 py-1.5 text-[11px] outline-none focus:border-[#FFD700]"
                    placeholder="@handle"
                  />
                </div>

                <div>
                  <label className="block text-xs text-white/60 mb-1">Telegram (optional)</label>
                  <input
                    value={localTelegram}
                    onChange={(e) => setLocalTelegram(e.target.value)}
                    className="w-full rounded-lg bg-black/60 border border-white/20 px-2.5 py-1.5 text-[11px] outline-none focus:border-[#FFD700]"
                    placeholder="@handle"
                  />
                </div>

                <div className="pt-4">
                  <div className="flex items-center gap-2 text-[11px] text-white/70">
                    <input
                      id="show-balances"
                      type="checkbox"
                      checked={showBalancesPublic}
                      onChange={(e) => setShowBalancesPublic(e.target.checked)}
                      className="h-3 w-3 rounded border-white/40 bg-black"
                    />
                    <label htmlFor="show-balances">
                      Show balances on public leaderboards (later)
                    </label>
                  </div>
                </div>
              </div>

              {/* Avatar color */}
              <div className="grid grid-cols-[auto,1fr] gap-3 items-center pt-1">
                <div className="text-[11px] text-white/60">Avatar color</div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={localAvatarColor}
                    onChange={(e) => setLocalAvatarColor(e.target.value)}
                    className="h-8 w-10 rounded-md border border-white/30 bg-transparent"
                  />
                  <span className="text-[11px] text-white/45">
                    Used behind initials if no image is uploaded.
                  </span>
                </div>
              </div>

              {/* Visibility */}
              <div className="border-t border-white/10 pt-3 mt-1 space-y-2">
                <div className="text-[11px] text-white/60 font-semibold">Profile visibility</div>
                <div className="flex flex-wrap gap-3 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setProfileVisibility("public")}
                    className={`rounded-full border px-3 py-1 ${
                      profileVisibility === "public"
                        ? "border-emerald-400 bg-emerald-500/15 text-emerald-100"
                        : "border-white/20 bg-black/40 text-white/60"
                    }`}
                  >
                    Public
                  </button>
                  <button
                    type="button"
                    onClick={() => setProfileVisibility("private")}
                    className={`rounded-full border px-3 py-1 ${
                      profileVisibility === "private"
                        ? "border-white/60 bg-white/10 text-white"
                        : "border-white/20 bg-black/40 text-white/60"
                    }`}
                  >
                    Private
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-[#FFD700] px-4 py-2 text-sm font-semibold text-black hover:bg-yellow-400 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save Profile ID"}
              </button>

              {saveError && (
                <div className="mt-1 text-[11px] text-red-400">{saveError}</div>
              )}

              <div className="text-[10px] text-white/45 sm:text-right">
                Stored in a Secured Casino database and used across Base Gold Rush Casino.
              </div>
            </div>
          </form>

          {/* Right: Profile ID + stats + wallet preview */}
          <div className="space-y-4">
            {/* Lightweight stats */}
            <div className="rounded-2xl border border-white/15 bg-gradient-to-b from-[#020617] to-black p-4 space-y-3">
              <div className="text-[10px] uppercase tracking-[0.25em] text-white/50">
                Early Access Snapshot
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="text-white/60">Games tracked</div>
                  <div className="text-lg font-semibold text-white">{games}</div>
                </div>
                <div>
                  <div className="text-white/60">Win rate</div>
                  <div className="text-lg font-semibold text-[#FFD700]">
                    {winRate === "—" ? "—" : `${winRate}%`}
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-white/45">
                As BGRC systems mature, this becomes lifetime volume, leaderboards, and seasonal rewards.
              </p>
            </div>

            {/* Profile ID & import */}
            <div className="rounded-2xl border border-dashed border-white/20 bg-black/65 p-4 space-y-3 text-[11px]">
              <div className="text-[10px] uppercase tracking-[0.25em] text-white/45">
                Profile ID &amp; Cross-Device
              </div>

              <p className="text-white/70">
                Your Profile ID lets you pull this same identity into another browser before wallet recovery is live.
              </p>

              <div className="space-y-1">
                <div className="text-[10px] text-white/55">Your Profile ID</div>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={profileId ?? "Saving profile to generate ID…"}
                    className="flex-1 rounded-lg bg-black/70 border border-white/25 px-2.5 py-1.5 text-[11px] text-white/80"
                  />
                  {profileId && (
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(profileId).catch(() => {})}
                      className="rounded-lg border border-white/30 bg-white/5 px-2 py-1 text-[10px] hover:bg-white/10"
                    >
                      Copy
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-white/45">
                  Save this if you want to reuse the same profile on another device.
                </p>
              </div>

              <form onSubmit={handleImportProfileId} className="space-y-2 pt-2 border-t border-white/10 mt-2">
                <div className="text-[10px] text-white/55">
                  Use existing Profile ID (new device / browser)
                </div>
                <input
                  value={importId}
                  onChange={(e) => setImportId(e.target.value)}
                  placeholder="Paste a Profile ID here…"
                  className="w-full rounded-lg bg-black/70 border border-white/25 px-2.5 py-1.5 text-[11px] text-white/80"
                />
                <button
                  type="submit"
                  className="w-full rounded-lg border border-[#FFD700]/70 bg-[#FFD700]/10 px-3 py-1.5 text-[11px] font-semibold text-[#FFE58A] hover:bg-[#FFD700]/20"
                >
                  Apply Profile ID to this browser
                </button>
                {importStatus && (
                  <div className="text-[10px] text-emerald-300 mt-1">{importStatus}</div>
                )}
              </form>

              <p className="text-[10px] text-white/45">
                This uses a guest ID in this browser. Wallet-linked recovery comes later.
              </p>
            </div>

            {/* Wallet link preview */}
            <div className="rounded-2xl border border-sky-400/40 bg-sky-950/40 p-4 space-y-2 text-[11px]">
              <div className="text-[10px] uppercase tracking-[0.25em] text-sky-200/90">
                Wallet Link (Preview)
              </div>

              <p className="text-sky-100/85">
                Optional for now. Later, linking a wallet allows automatic recovery and BGRC chip settlement.
              </p>

              <div className="mt-1 text-[10px] text-sky-200/80">
                Connected wallet:{" "}
                <span className="font-mono">
                  {address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "No wallet connected"}
                </span>
              </div>

              <div className="mt-1 text-[10px] text-sky-200/80">
                Linked to profile:{" "}
                <span className="font-mono">
                  {linkedWallet ? `${linkedWallet.slice(0, 6)}…${linkedWallet.slice(-4)}` : "Not linked yet"}
                </span>
              </div>

              <button
                type="button"
                onClick={handleLinkWallet}
                disabled={walletLinking}
                className="mt-2 w-full rounded-lg border border-sky-300/70 bg-sky-500/15 px-3 py-1.5 text-[11px] font-semibold text-sky-100 hover:bg-sky-500/25 disabled:opacity-50"
              >
                {walletLinking ? "Linking wallet…" : "Link current wallet to this Casino ID"}
              </button>

              {walletLinkError && (
                <div className="text-[10px] text-red-300 mt-1">{walletLinkError}</div>
              )}
              {walletLinkSuccess && (
                <div className="text-[10px] text-emerald-300 mt-1">{walletLinkSuccess}</div>
              )}

              <p className="mt-1 text-[10px] text-sky-200/70">
                Email recovery can be added later as a secondary option.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
