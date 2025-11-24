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
  addWin: (amount: number) => void
  addLoss: (amount: number) => void
  // ✅ used by mint buttons / reload
  addCredits: (amount: number) => void
}

const ArcadeWalletContext = createContext<ArcadeWalletContextValue | null>(null)

// Fallback so using the hook without a provider doesn’t crash, but it’s inert.
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
    addCredits: () => {},
  }
}

export function ArcadeWalletProvider({ children }: { children: React.ReactNode }) {
  const [initialCredits] = useState(10_000)
  const [credits, setCredits] = useState(initialCredits)
  const [net, setNet] = useState(0)
  const [spins, setSpins] = useState(0)
  const [wins, setWins] = useState(0)
  const [resets, setResets] = useState(0)

  const recordSpin: ArcadeWalletContextValue['recordSpin'] = ({ wager, payout }) => {
    setCredits(prev => prev - wager + payout)

    const delta = payout - wager
    setNet(prev => prev + delta)
    setSpins(prev => prev + 1)
    if (delta > 0) setWins(prev => prev + 1)
  }

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
  }

  const resetWallet = () => {
    setCredits(initialCredits)
    setNet(0)
    setSpins(0)
    setWins(0)
    setResets(prev => prev + 1)
  }

  const recordReset = () => setResets(prev => prev + 1)

  // ✅ Mint / reload chips (NO impact on P&L)
const addCredits: ArcadeWalletContextValue['addCredits'] = (amount: number) => {
  if (amount <= 0) return
  setCredits(prev => prev + amount)
  // Do NOT update net — this prevents mint being counted as a win.
}



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
      addCredits,
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
