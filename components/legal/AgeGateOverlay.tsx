'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

const STORAGE_KEY = 'bg_age_verified_v2'

export default function AgeGateOverlay() {
  const [isVerified, setIsVerified] = useState<boolean | null>(null)
  const [checks, setChecks] = useState({ age: false, terms: false })

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = window.localStorage.getItem(STORAGE_KEY)
    setIsVerified(stored === 'true')
  }, [])

  const allChecked = checks.age && checks.terms

  const handleEnter = () => {
    if (!allChecked) return
    window.localStorage.setItem(STORAGE_KEY, 'true')
    setIsVerified(true)
  }

  // If already verified, do nothing
  if (isVerified === null || isVerified) return null

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/90 px-4">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 opacity-25">
        <Image
          src="/images/agegate-bg.png"
          alt=""
          fill
          priority
          className="object-cover"
        />
      </div>

      <div className="relative w-full max-w-md rounded-2xl border border-yellow-500/40 bg-neutral-950/95 p-5 md:p-6 shadow-2xl">
        {/* Logo + Title */}
        <div className="flex flex-col items-center text-center mb-4">
          <div className="flex items-center justify-center gap-2">
            <Image
              src="/images/goldrush-icon-v2.png"
              alt="Base Gold Rush"
              width={34}
              height={34}
              className="rounded"
            />
            <div className="text-[10px] uppercase tracking-[0.35em] text-white/60">
              Welcome to
            </div>
          </div>
          <h1 className="mt-2 text-xl md:text-2xl font-semibold text-yellow-100">
            Base Gold Rush
          </h1>
          <p className="mt-1 text-xs md:text-sm text-neutral-300">
            Quick confirmation to enter.
          </p>
        </div>

        {/* Checks */}
        <div className="space-y-3 text-xs md:text-sm text-neutral-200 mb-4">
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={checks.age}
              onChange={(e) => setChecks((p) => ({ ...p, age: e.target.checked }))}
            />
            <span>
              I am at least <span className="font-semibold">18+</span> (or legal age in my jurisdiction).
            </span>
          </label>

          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={checks.terms}
              onChange={(e) => setChecks((p) => ({ ...p, terms: e.target.checked }))}
            />
            <span>
              I have read and agree to the{' '}
              <Link href="/legal/terms" className="underline underline-offset-2 hover:text-white">
                Terms & Conditions
              </Link>
              .
            </span>
          </label>
        </div>

        {/* CTA */}
        <button
          onClick={handleEnter}
          disabled={!allChecked}
          className={`w-full rounded-lg py-2.5 text-sm font-semibold transition ${
            allChecked
              ? 'bg-yellow-500 text-black hover:bg-yellow-400'
              : 'bg-neutral-700 text-neutral-400 cursor-not-allowed'
          }`}
        >
          Enter
        </button>

        <p className="mt-3 text-[10px] text-neutral-500 text-center">
          Not available where prohibited. Non-custodial. On-chain actions are irreversible.
        </p>

        <p className="mt-2 text-[10px] text-neutral-600 text-center">
          If you do not agree, close this tab or navigate away.
        </p>
      </div>
    </div>
  )
}
