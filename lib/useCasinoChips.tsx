'use client'

import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  ReactNode,
} from 'react'

type CasinoChipsContextValue = {
  balance: number
  totalMinted: number
  totalBurned: number
  mintChips: (amount: number) => void
  spendChips: (amount: number) => boolean
  resetDemo: () => void
}

const CasinoChipsContext = createContext<CasinoChipsContextValue | null>(null)

function useCasinoChipsFallback(): CasinoChipsContextValue {
  return {
    balance: 0,
    totalMinted: 0,
    totalBurned: 0,
    mintChips: () => {},
    spendChips: () => false,
    resetDemo: () => {},
  }
}

const INITIAL_STACK = 10_000

export function CasinoChipsProvider({ children }: { children: ReactNode }) {
  const [balance, setBalance] = useState(INITIAL_STACK)
  const [totalMinted, setTotalMinted] = useState(INITIAL_STACK)
  const [totalBurned, setTotalBurned] = useState(0)

  const mintChips = (amount: number) => {
    if (amount <= 0) return
    setBalance(prev => prev + amount)
    setTotalMinted(prev => prev + amount)
  }

  const spendChips = (amount: number) => {
    if (amount <= 0) return true
    let ok = false
    setBalance(prev => {
      if (prev >= amount) {
        ok = true
        return prev - amount
      }
      ok = false
      return prev
    })
    if (ok) {
      setTotalBurned(prev => prev + amount)
    }
    return ok
  }

  const resetDemo = () => {
    setBalance(INITIAL_STACK)
    setTotalMinted(INITIAL_STACK)
    setTotalBurned(0)
  }

  const value = useMemo(
    () => ({
      balance,
      totalMinted,
      totalBurned,
      mintChips,
      spendChips,
      resetDemo,
    }),
    [balance, totalMinted, totalBurned]
  )

  return (
    <CasinoChipsContext.Provider value={value}>
      {children}
    </CasinoChipsContext.Provider>
  )
}

export function useCasinoChips(): CasinoChipsContextValue {
  const ctx = useContext(CasinoChipsContext)
  return ctx ?? useCasinoChipsFallback()
}
