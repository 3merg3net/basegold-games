// app/profile/page.tsx
'use client';

import {
  useEffect,
  useMemo,
  useState,
  ChangeEvent,
  FormEvent,
} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { usePlayerProfileContext } from '@/lib/player/PlayerProfileProvider';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

const LOCAL_STORAGE_KEY = 'bgld_player_id';





type StyleOption = 'tight' | 'loose' | 'aggro' | 'balanced';

export default function PokerProfilePage() {
  const { profile, updateProfile, loading, error } =
    usePlayerProfileContext() as any;

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
  const [localName, setLocalName] = useState('');
  const [localBio, setLocalBio] = useState('');
  const [localStyle, setLocalStyle] = useState<StyleOption>('balanced');
  const [localX, setLocalX] = useState('');
  const [localTelegram, setLocalTelegram] = useState('');
  const [localAvatarColor, setLocalAvatarColor] = useState('#facc15');

  // cross-device profile id import
  const [importId, setImportId] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const avatarUrl = (profile as any)?.avatarUrl as string | undefined;
  const profileId = (profile as any)?.id as string | undefined;
  const linkedWallet = (profile as any)?.walletAddress as string | undefined;

  // derived stats
  const hands = profile?.totalHands ?? 0;
  const pots = profile?.totalPotsWon ?? 0;
  const winRate = hands > 0 ? ((pots / hands) * 100).toFixed(1) : '—';
  const biggest = profile?.biggestPot ?? 0;

  useEffect(() => {
    if (!profile) return;

    setLocalName(profile.name ?? '');
    setLocalBio(profile.bio ?? '');
    setLocalStyle((profile.style as StyleOption) ?? 'balanced');
    setLocalX((profile.xHandle as string) ?? '');
    setLocalTelegram((profile.telegramHandle as string) ?? '');
    setLocalAvatarColor(profile.avatarColor ?? '#facc15');
  }, [profile]);

  const initials = useMemo(() => {
    const trimmed = localName.trim();
    if (!trimmed) return '??';
    return trimmed
      .split(/\s+/)
      .map((p) => p[0] ?? '')
      .join('')
      .slice(0, 3)
      .toUpperCase();
  }, [localName]);

  async function handleSave(e: FormEvent) {
  e.preventDefault();
  if (!profile) return;

  setSaving(true);
  setSaveError(null);

  try {
    await updateProfile({
      name: localName,
      bio: localBio,
      style: localStyle,
      xHandle: localX,
      telegramHandle: localTelegram,
      avatarColor: localAvatarColor,
      avatarInitials: initials,
    } as any);

    // ✅ redirect after successful save
    router.push('/poker'); // <-- change this path if your poker table route is different
  } catch (err: any) {
    console.error('[profile] save error', err);
    setSaveError(err?.message ?? 'Failed to save profile. Please try again.');
  } finally {
    setSaving(false);
  }
}


  async function handleAvatarChange(e: ChangeEvent<HTMLInputElement>) {
    setAvatarError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (!profile?.id) {
      setAvatarError('Save your basic profile first, then upload an avatar.');
      return;
    }

    try {
      setAvatarUploading(true);
      const bucket = 'poker-avatars';
      const ext = file.name.split('.').pop() || 'png';
      const path = `${profile.id}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        console.error(uploadError);
        setAvatarError('Upload failed. Try a smaller image or different file.');
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(path);

      const publicUrl = publicUrlData?.publicUrl;
      if (!publicUrl) {
        setAvatarError('Could not resolve public URL for avatar.');
        return;
      }

      await updateProfile({ avatarUrl: publicUrl } as any);
    } catch (err) {
      console.error(err);
      setAvatarError('Unexpected error uploading avatar.');
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
      // Assumes PlayerProfileProvider reads this same key
      localStorage.setItem(LOCAL_STORAGE_KEY, trimmed);
      setImportStatus('Profile ID applied. Reloading this browser to sync…');
      // small delay so they can see the message
      setTimeout(() => {
        window.location.reload();
      }, 600);
    } catch (err) {
      console.error(err);
      setImportStatus('Could not apply Profile ID in this browser.');
    }
  }

  async function handleLinkWallet() {
    setWalletLinkError(null);
    setWalletLinkSuccess(null);

    if (!profile?.id) {
      setWalletLinkError('Save your profile first, then link a wallet.');
      return;
    }
    if (!address) {
      setWalletLinkError('Connect a wallet in the header first, then link it here.');
      return;
    }

    try {
      setWalletLinking(true);
      await updateProfile({ walletAddress: address } as any);
      setWalletLinkSuccess('Wallet linked to this profile. Connect this wallet on any device to retrieve it.');
    } catch (err) {
      console.error(err);
      setWalletLinkError('Failed to link wallet. Try again or later.');
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
              Base Gold Rush • Player Identity
            </div>
            <h1 className="mt-1 text-2xl md:text-3xl font-extrabold tracking-tight">
              Poker Profile &amp; Casino Identity
            </h1>
            <p className="mt-2 text-sm text-white/70 max-w-xl">
              This profile powers your name, avatar, and rail presence across the
              Base Gold Rush poker room and arcade. Free play today — later this
              same identity plugs into BGLD cash games and tournaments.
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
                Profile synced
              </span>
            )}
            {error && (
              <div className="mt-1 text-[11px] text-red-400">
                Error loading profile: {String(error)}
              </div>
            )}

            <Link
              href="/poker-demo"
              className="mt-1 inline-flex items-center justify-center rounded-full bg-[#FFD700] px-3 py-1.5 text-[11px] font-semibold text-black hover:bg-yellow-400"
            >
              ← Return to Poker Room
            </Link>
          </div>
        </header>

        <div className="grid gap-6 md:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
          {/* Left: profile + avatar + handles */}
          <form
            onSubmit={handleSave}
            className="space-y-4 rounded-2xl border border-white/15 bg-gradient-to-b from-[#020617] to-black p-4 md:p-5"
          >
            {/* Avatar + upload */}
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
                  Avatar shown at the table
                </div>
              </div>

              <div className="flex-1 space-y-2 text-[11px]">
                <div className="font-semibold text-white/80">
                  Upload avatar
                </div>
                <p className="text-white/55">
                  Choose a square-ish image (JPG/PNG). We host it in Supabase and render it
                  on the felt and leaderboards.
                </p>
                <div className="flex flex-col gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="text-[11px] file:mr-2 file:rounded-md file:border-0 file:bg-[#FFD700] file:px-2 file:py-1 file:text-xs file:font-semibold file:text-black file:hover:bg-yellow-400"
                  />
                  {avatarUploading && (
                    <div className="text-[11px] text-amber-300">
                      Uploading avatar…
                    </div>
                  )}
                  {avatarError && (
                    <div className="text-[11px] text-red-400">
                      {avatarError}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Core identity */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-white/60 mb-1">
                  Poker nickname
                </label>
                <input
                  value={localName}
                  onChange={(e) => setLocalName(e.target.value)}
                  className="w-full rounded-lg bg-black/60 border border-white/20 px-3 py-2 text-sm outline-none focus:border-[#FFD700]"
                  placeholder="Ex: River King, GG Grinder, BasedDegen…"
                />
                <p className="mt-1 text-[11px] text-white/45">
                  Shown on your seat, rail, and leaderboards. Keep it fun and anonymous if you want.
                </p>
              </div>

              <div>
                <label className="block text-xs text-white/60 mb-1">
                  Table bio
                </label>
                <textarea
                  value={localBio}
                  onChange={(e) => setLocalBio(e.target.value)}
                  className="w-full rounded-lg bg-black/60 border border-white/20 px-3 py-2 text-[11px] outline-none focus:border-[#FFD700] min-h-[70px]"
                  placeholder="One or two lines about your playstyle or vibe at the table…"
                />
              </div>

              {/* Optional style + socials (kept but subtle) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-white/60 mb-1">
                    Style (optional)
                  </label>
                  <select
                    value={localStyle}
                    onChange={(e) =>
                      setLocalStyle(e.target.value as StyleOption)
                    }
                    className="w-full rounded-lg bg-black/60 border border-white/20 px-2.5 py-1.5 text-[11px] outline-none focus:border-[#FFD700]"
                  >
                    <option value="tight">Tight</option>
                    <option value="loose">Loose</option>
                    <option value="aggro">Aggressive</option>
                    <option value="balanced">Balanced</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-white/60 mb-1">
                    X (Twitter)
                  </label>
                  <input
                    value={localX}
                    onChange={(e) => setLocalX(e.target.value)}
                    className="w-full rounded-lg bg-black/60 border border-white/20 px-2.5 py-1.5 text-[11px] outline-none focus:border-[#FFD700]"
                    placeholder="@baseddegen"
                  />
                </div>

                <div>
                  <label className="block text-xs text-white/60 mb-1">
                    Telegram
                  </label>
                  <input
                    value={localTelegram}
                    onChange={(e) => setLocalTelegram(e.target.value)}
                    className="w-full rounded-lg bg-black/60 border border-white/20 px-2.5 py-1.5 text-[11px] outline-none focus:border-[#FFD700]"
                    placeholder="@handle"
                  />
                </div>
              </div>

              {/* Avatar color tweak */}
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
                    Used behind your initials if no image is uploaded.
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-[#FFD700] px-4 py-2 text-sm font-semibold text-black hover:bg-yellow-400 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save profile'}
              </button>
              {saveError && (
  <div className="mt-1 text-[11px] text-red-400">
    {saveError}
  </div>
)}

              <div className="text-[10px] text-white/45 sm:text-right">
                Profile is stored in Supabase and used across the Base Gold Rush
                poker room, arcade, and future BGLD cash games.
              </div>
            </div>
          </form>

          {/* Right: stats + profile ID + wallet link */}
          <div className="space-y-4">
            {/* Stats card */}
            <div className="rounded-2xl border border-white/15 bg-gradient-to-b from-[#020617] to-black p-4 space-y-3 text-sm">
              <div className="text-[10px] uppercase tracking-[0.25em] text-white/50">
                Free Play Session Stats
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="text-white/60">Hands played</div>
                  <div className="text-lg font-semibold text-white">
                    {hands}
                  </div>
                </div>
                <div>
                  <div className="text-white/60">Pots won</div>
                  <div className="text-lg font-semibold text-emerald-300">
                    {pots}
                  </div>
                </div>
                <div>
                  <div className="text-white/60">Win rate</div>
                  <div className="text-lg font-semibold text-[#FFD700]">
                    {winRate === '—' ? '—' : `${winRate}%`}
                  </div>
                </div>
                <div>
                  <div className="text-white/60">Biggest pot</div>
                  <div className="text-lg font-semibold text-white">
                    {biggest.toLocaleString()}{' '}
                    <span className="text-[10px]">free chips</span>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-white/45">
                As we wire full BGRC / BGLD integration, this panel grows into lifetime
                volume, ROI, and tournament finishes.
              </p>
            </div>

            {/* Profile ID & import */}
            <div className="rounded-2xl border border-dashed border-white/20 bg-black/65 p-4 space-y-3 text-[11px]">
              <div className="text-[10px] uppercase tracking-[0.25em] text-white/45">
                Profile ID &amp; Cross-Device
              </div>

              <p className="text-white/70">
                Your Profile ID lets you pull this same identity into another browser
                before wallets are fully live.
              </p>

              <div className="space-y-1">
                <div className="text-[10px] text-white/55">Your Profile ID</div>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={profileId ?? 'Saving profile to generate ID…'}
                    className="flex-1 rounded-lg bg-black/70 border border-white/25 px-2.5 py-1.5 text-[11px] text-white/80"
                  />
                  {profileId && (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard
                          .writeText(profileId)
                          .catch(() => {});
                      }}
                      className="rounded-lg border border-white/30 bg-white/5 px-2 py-1 text-[10px] hover:bg-white/10"
                    >
                      Copy
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-white/45">
                  Save this somewhere safe if you want to reuse this profile on another device.
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
                  <div className="text-[10px] text-emerald-300 mt-1">
                    {importStatus}
                  </div>
                )}
              </form>

              <p className="text-[10px] text-white/45">
                This uses a guest ID in this browser only. Wallet-linked profiles will
                auto-sync across devices once live.
              </p>
            </div>

            {/* Wallet link card */}
            <div className="rounded-2xl border border-sky-400/40 bg-sky-950/40 p-4 space-y-2 text-[11px]">
              <div className="text-[10px] uppercase tracking-[0.25em] text-sky-200/90">
                Wallet Link (Preview)
              </div>
              <p className="text-sky-100/85">
                Link a wallet to this profile so that, when BGLD cash games go live, we
                can attach your casino identity to on-chain play.
              </p>

              <div className="mt-1 text-[10px] text-sky-200/80">
                Connected wallet:{' '}
                <span className="font-mono">
                  {address ? `${address.slice(0, 6)}…${address.slice(-4)}` : 'No wallet connected'}
                </span>
              </div>

              <div className="mt-1 text-[10px] text-sky-200/80">
                Linked to profile:{' '}
                <span className="font-mono">
                  {linkedWallet
                    ? `${linkedWallet.slice(0, 6)}…${linkedWallet.slice(-4)}`
                    : 'Not linked yet'}
                </span>
              </div>

              <button
                type="button"
                onClick={handleLinkWallet}
                disabled={walletLinking}
                className="mt-2 w-full rounded-lg border border-sky-300/70 bg-sky-500/15 px-3 py-1.5 text-[11px] font-semibold text-sky-100 hover:bg-sky-500/25 disabled:opacity-50"
              >
                {walletLinking ? 'Linking wallet…' : 'Link current wallet to this profile'}
              </button>

              {walletLinkError && (
                <div className="text-[10px] text-red-300 mt-1">
                  {walletLinkError}
                </div>
              )}
              {walletLinkSuccess && (
                <div className="text-[10px] text-emerald-300 mt-1">
                  {walletLinkSuccess}
                </div>
              )}

              <p className="mt-1 text-[10px] text-sky-200/70">
                Later, when you connect this wallet on any device, we&apos;ll pull the same
                profile without needing a password.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
