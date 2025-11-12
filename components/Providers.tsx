'use client'

import { ReactNode, useEffect, useState } from 'react'
import { WagmiConfig, createConfig, configureChains } from 'wagmi'
import { jsonRpcProvider } from 'wagmi/providers/jsonRpc'
import {
  RainbowKitProvider,
  getDefaultWallets,
  darkTheme,
} from '@rainbow-me/rainbowkit'

// ---- ENV ----
const WC_PROJECT_ID =
  process.env.NEXT_PUBLIC_WC_PROJECT_ID ?? '00000000000000000000000000000000'
const BASE_RPC = process.env.NEXT_PUBLIC_BASE_RPC || 'https://mainnet.base.org'
const BASE_SEPOLIA_RPC =
  process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC || 'https://sepolia.base.org'

// ---- Chain objects (compatible with wagmi v1) ----
const baseChain = {
  id: 8453,
  name: 'Base',
  network: 'base',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: [BASE_RPC] },
    public: { http: [BASE_RPC] },
  },
  blockExplorers: {
    default: { name: 'Basescan', url: 'https://basescan.org' },
  },
  testnet: false,
} as const

const baseSepoliaChain = {
  id: 84532,
  name: 'Base Sepolia',
  network: 'base-sepolia',
  nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: [BASE_SEPOLIA_RPC] },
    public: { http: [BASE_SEPOLIA_RPC] },
  },
  blockExplorers: {
    default: { name: 'BaseSepoliaScan', url: 'https://sepolia.basescan.org' },
  },
  testnet: true,
} as const

// ---- wagmi v1 wiring (configureChains + jsonRpcProvider) ----
const { chains, publicClient, webSocketPublicClient } = configureChains(
  [baseSepoliaChain, baseChain],
  [
    jsonRpcProvider({
      rpc: (chain) => {
        if (chain.id === baseChain.id) return { http: BASE_RPC }
        if (chain.id === baseSepoliaChain.id) return { http: BASE_SEPOLIA_RPC }
        return null
      },
    }),
  ],
)

// ---- RainbowKit v1 connectors ----
const { connectors } = getDefaultWallets({
  appName: 'BaseGold Games',
  projectId: WC_PROJECT_ID,
  chains,
})

// ---- wagmi v1 config (no `chains` prop here) ----
const wagmiConfig = createConfig({
  autoConnect: true,
  connectors,
  publicClient,
  webSocketPublicClient,
})

export default function Providers({ children }: { children: ReactNode }) {
  // small SSR hydration guard to avoid “text content did not match”
  const [ready, setReady] = useState(false)
  useEffect(() => setReady(true), [])

  return (
    <WagmiConfig config={wagmiConfig}>
      <RainbowKitProvider
        chains={chains}
        modalSize="compact"
        theme={darkTheme({ accentColor: '#FFD700', borderRadius: 'large' })}
      >
        {ready ? children : null}
      </RainbowKitProvider>
    </WagmiConfig>
  )
}
