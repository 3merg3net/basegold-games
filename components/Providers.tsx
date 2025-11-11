'use client'

import { ReactNode, useMemo } from 'react'
import {
  WagmiConfig,
  createConfig,
  http,
} from 'wagmi'
import { RainbowKitProvider, getDefaultWallets, darkTheme } from '@rainbow-me/rainbowkit'
import '@rainbow-me/rainbowkit/styles.css'

// Inline chain defs to avoid wagmi/chains import
const base = {
  id: 8453,
  name: 'Base',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ['https://mainnet.base.org'] }, public: { http: ['https://mainnet.base.org'] } },
  blockExplorers: { default: { name: 'BaseScan', url: 'https://basescan.org' } },
} as const

const baseSepolia = {
  id: 84532,
  name: 'Base Sepolia',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ['https://sepolia.base.org'] }, public: { http: ['https://sepolia.base.org'] } },
  blockExplorers: { default: { name: 'BaseScan', url: 'https://sepolia.basescan.org' } },
} as const

const CHAINS = [base, baseSepolia] as const

export default function Providers({ children }: { children: ReactNode }) {
  const transports = useMemo(() => ({
    [base.id]: http(process.env.NEXT_PUBLIC_BASE_RPC || 'https://mainnet.base.org'),
    [baseSepolia.id]: http(process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC || 'https://sepolia.base.org'),
  }), [])

  const { connectors } = getDefaultWallets({
    appName: 'Base Gold Rush',
    projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID || 'demo', // WalletConnect v2
    chains: CHAINS as any,
  })

  const config = useMemo(() => createConfig({
    chains: CHAINS as any,
    connectors,
    transports,
    ssr: true,
  }), [connectors, transports])

  return (
    <WagmiConfig config={config}>
      <RainbowKitProvider
        chains={CHAINS as any}
        theme={darkTheme({
          accentColor: '#FFD700',
          accentColorForeground: '#000',
          borderRadius: 'large',
        })}
        modalSize="compact"
      >
        {children}
      </RainbowKitProvider>
    </WagmiConfig>
  )
}
