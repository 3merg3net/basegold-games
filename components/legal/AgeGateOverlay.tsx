'use client'

import { useEffect, useState } from 'react'

const STORAGE_KEY = 'bg_age_verified_v1'

export default function AgeGateOverlay() {
  const [isVerified, setIsVerified] = useState<boolean | null>(null)
  const [checkboxes, setCheckboxes] = useState({
    age: false,
    laws: false,
    risk: false,
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = window.localStorage.getItem(STORAGE_KEY)
    setIsVerified(stored === 'true')
  }, [])

  const allChecked = checkboxes.age && checkboxes.laws && checkboxes.risk

  const handleEnter = () => {
    if (!allChecked) return
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, 'true')
    }
    setIsVerified(true)
  }

  // If already verified, do nothing
  if (isVerified === null || isVerified) return null

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/90 px-4">
      <div className="w-full max-w-md rounded-2xl border border-yellow-500/40 bg-neutral-950/95 p-5 md:p-6 shadow-2xl">
        <h1 className="text-xl md:text-2xl font-semibold text-yellow-100 mb-2 text-center">
          Enter Base Gold Rush
        </h1>
        <p className="text-xs md:text-sm text-neutral-300 mb-4 text-center">
          Before entering, please confirm the following:
        </p>

        <div className="space-y-3 text-xs md:text-sm text-neutral-200 mb-4">
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={checkboxes.age}
              onChange={(e) =>
                setCheckboxes((prev) => ({ ...prev, age: e.target.checked }))
              }
            />
            <span>
              I am at least <span className="font-semibold">21 years old</span> or
              the legal age of majority in my jurisdiction.
            </span>
          </label>

          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={checkboxes.laws}
              onChange={(e) =>
                setCheckboxes((prev) => ({ ...prev, laws: e.target.checked }))
              }
            />
            <span>
              I am accessing this site from a location where{' '}
              <span className="font-semibold">
                crypto gaming and on-chain wagering
              </span>{' '}
              are not prohibited, and I am solely responsible for complying with my
              local laws.
            </span>
          </label>

          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={checkboxes.risk}
              onChange={(e) =>
                setCheckboxes((prev) => ({ ...prev, risk: e.target.checked }))
              }
            />
            <span>
              I understand that{' '}
              <span className="font-semibold">on-chain tokens are volatile</span> and
              that I can lose some or all of the tokens I use in games.
            </span>
          </label>
        </div>

        <p className="text-[11px] md:text-xs text-neutral-400 mb-4">
          Base Gold Rush is a crypto-based entertainment platform. No financial
          advice is provided. Use of this site is at your own risk.
        </p>

        <button
          onClick={handleEnter}
          disabled={!allChecked}
          className={`w-full rounded-lg py-2.5 text-sm font-semibold transition ${
            allChecked
              ? 'bg-yellow-500 text-black hover:bg-yellow-400'
              : 'bg-neutral-700 text-neutral-400 cursor-not-allowed'
          }`}
        >
          Enter Site
        </button>
        <p className="mt-3 text-[10px] text-neutral-500 text-center">
  By entering, you confirm that blockchain-based gaming is legal in your
  jurisdiction and that you are fully responsible for complying with local laws.
</p>


        <p className="mt-3 text-[11px] text-center text-neutral-500">
          If you do not agree, please close this tab or navigate away.
        </p>
      </div>
    </div>
  )
}
