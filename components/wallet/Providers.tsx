'use client'

import { ReactNode } from 'react'
import {
  WagmiConfig,
  configureChains,
  createConfig,
} from 'wagmi'
import { base, baseSepolia } from 'wagmi/chains'
import { jsonRpcProvider } from 'wagmi/providers/jsonRpc'
import { publicProvider } from 'wagmi/providers/public'

import {
  RainbowKitProvider,
  getDefaultWallets,
} from '@rainbow-me/rainbowkit'
import '@rainbow-me/rainbowkit/styles.css'

const BASE_RPC = process.env.NEXT_PUBLIC_BASE_RPC || 'https://mainnet.base.org'
const BASE_SEPOLIA_RPC =
  process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC || 'https://sepolia.base.org'
const WC_PROJECT_ID =
  process.env.NEXT_PUBLIC_WC_PROJECT_ID || 'demo-wc-project-id'

const { chains, publicClient, webSocketPublicClient } = configureChains(
  [base, baseSepolia],
  [
    jsonRpcProvider({
      rpc: (chain) => {
        if (chain.id === base.id) return { http: BASE_RPC }
        if (chain.id === baseSepolia.id) return { http: BASE_SEPOLIA_RPC }
        return null
      },
    }),
    publicProvider(),
  ],
)

const { connectors } = getDefaultWallets({
  appName: 'BaseGold Games',
  projectId: WC_PROJECT_ID,
  chains,
})

const wagmiConfig = createConfig({
  autoConnect: true,
  connectors,
  publicClient,
  webSocketPublicClient,
})

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <WagmiConfig config={wagmiConfig}>
      <RainbowKitProvider chains={chains}>{children}</RainbowKitProvider>
    </WagmiConfig>
  )
}
