'use client'

import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  ReactNode,
} from 'react'

/**
 * Global demo arcade wallet context.
 * Shared across all arcade games (roulette, blackjack, poker room, etc.).
 */

type ArcadeWalletContextValue = {
  /** Current demo credits available to spend */
  credits: number
  /** Starting stack for this session (e.g. 1,000) */
  initialCredits: number
  /** Lifetime net across all arcade games (wins - losses) */
  net: number
  /** Number of full resets / rebuys */
  resets: number

  /**
   * Record a straight win (e.g. player wins +X credits).
   * Used by games like blackjack that just call addWin/addLoss.
   */
  addWin: (amount: number, meta?: { game?: string }) => void

  /**
   * Record a straight loss (e.g. player loses X credits).
   */
  addLoss: (amount: number, meta?: { game?: string }) => void

  /**
   * Record a spin/round with explicit wager + payout.
   * Used by roulette where you know both numbers.
   */
  recordSpin: (wager: number, payout: number) => void

  /**
   * Fully reset the wallet to the initial stack and zero net.
   * Also increments the `resets` counter.
   */
  resetWallet: () => void

  /**
   * Alias for resetWallet so HUDs can call `recordReset()`.
   */
  recordReset: () => void
}

const ArcadeWalletContext = createContext<ArcadeWalletContextValue | null>(null)

type ProviderProps = {
  children: ReactNode
  /** Optional override for initial stack (default 1000) */
  initialStack?: number
}

export function ArcadeWalletProvider({
  children,
  initialStack = 1000,
}: ProviderProps) {
  const [initialCredits] = useState(initialStack)
  const [credits, setCredits] = useState(initialStack)
  const [net, setNet] = useState(0)
  const [resets, setResets] = useState(0)

  const addWin = (amount: number, _meta?: { game?: string }) => {
    if (amount <= 0) return
    setCredits(c => c + amount)
    setNet(n => n + amount)
  }

  const addLoss = (amount: number, _meta?: { game?: string }) => {
    if (amount <= 0) return
    setCredits(c => Math.max(0, c - amount))
    setNet(n => n - amount)
  }

  const recordSpin = (wager: number, payout: number) => {
    const delta = payout - wager
    if (!Number.isFinite(delta) || isNaN(delta)) return
    setCredits(c => Math.max(0, c + delta))
    setNet(n => n + delta)
  }

  const resetWallet = () => {
    setCredits(initialCredits)
    setNet(0)
    setResets(r => r + 1)
  }

  const recordReset = () => {
    resetWallet()
  }

  const value: ArcadeWalletContextValue = useMemo(
    () => ({
      credits,
      initialCredits,
      net,
      resets,
      addWin,
      addLoss,
      recordSpin,
      resetWallet,
      recordReset,
    }),
    [credits, initialCredits, net, resets]
  )

  return (
    <ArcadeWalletContext.Provider value={value}>
      {children}
    </ArcadeWalletContext.Provider>
  )
}

export function useArcadeWallet(): ArcadeWalletContextValue {
  const ctx = useContext(ArcadeWalletContext)
  if (!ctx) {
    throw new Error('useArcadeWallet must be used within ArcadeWalletProvider')
  }
  return ctx
}
