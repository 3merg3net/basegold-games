'use client'

import React, {
  createContext,
  useContext,
  useMemo,
  useState,
} from 'react'

export type ArcadeWalletContextValue = {
  credits: number
  initialCredits: number
  net: number
  spins: number
  wins: number
  resets: number
  recordSpin: (opts: { wager: number; payout: number }) => void
  resetWallet: () => void
  recordReset: () => void
  // ✅ extra helpers used by some games (e.g. BaccaratDemo)
  addWin: (amount: number) => void
  addLoss: (amount: number) => void
}

const ArcadeWalletContext = createContext<ArcadeWalletContextValue | null>(null)

// ✅ Safe fallback so using the hook without a provider
// during prerender *does not* crash the build.
function useArcadeWalletFallback(): ArcadeWalletContextValue {
  return {
    credits: 0,
    initialCredits: 0,
    net: 0,
    spins: 0,
    wins: 0,
    resets: 0,
    recordSpin: () => {},
    resetWallet: () => {},
    recordReset: () => {},
    addWin: () => {},
    addLoss: () => {},
  }
}

export function ArcadeWalletProvider({ children }: { children: React.ReactNode }) {
  const [initialCredits] = useState(10_000)
  const [credits, setCredits] = useState(initialCredits)
  const [net, setNet] = useState(0)
  const [spins, setSpins] = useState(0)
  const [wins, setWins] = useState(0)
  const [resets, setResets] = useState(0)

  // generic “spin” record (used by most games)
  const recordSpin: ArcadeWalletContextValue['recordSpin'] = ({ wager, payout }) => {
    setCredits(prev => prev - wager + payout)

    const delta = payout - wager
    setNet(prev => prev + delta)
    setSpins(prev => prev + 1)
    if (delta > 0) setWins(prev => prev + 1)
  }

  // baccarat-style helpers: explicit win/loss
  const addWin: ArcadeWalletContextValue['addWin'] = (amount: number) => {
    if (amount <= 0) return
    setCredits(prev => prev + amount)
    setNet(prev => prev + amount)
    setSpins(prev => prev + 1)
    setWins(prev => prev + 1)
  }

  const addLoss: ArcadeWalletContextValue['addLoss'] = (amount: number) => {
    if (amount <= 0) return
    setCredits(prev => Math.max(0, prev - amount))
    setNet(prev => prev - amount)
    setSpins(prev => prev + 1)
    // no win increment on a loss
  }

  const resetWallet = () => {
    setCredits(initialCredits)
    setNet(0)
    setSpins(0)
    setWins(0)
    setResets(prev => prev + 1)
  }

  const recordReset = () => setResets(prev => prev + 1)

  const value: ArcadeWalletContextValue = useMemo(
    () => ({
      credits,
      initialCredits,
      net,
      spins,
      wins,
      resets,
      recordSpin,
      resetWallet,
      recordReset,
      addWin,
      addLoss,
    }),
    [credits, initialCredits, net, spins, wins, resets]
  )

  return (
    <ArcadeWalletContext.Provider value={value}>
      {children}
    </ArcadeWalletContext.Provider>
  )
}

export function useArcadeWallet(): ArcadeWalletContextValue {
  const ctx = useContext(ArcadeWalletContext)
  return ctx ?? useArcadeWalletFallback()
}
