'use client'

import { ReactNode } from 'react'
import { WagmiConfig, configureChains, createConfig } from 'wagmi'
import { base, baseSepolia } from 'wagmi/chains'
import { jsonRpcProvider } from 'wagmi/providers/jsonRpc'
import { publicProvider } from 'wagmi/providers/public'

import { RainbowKitProvider, connectorsForWallets } from '@rainbow-me/rainbowkit'
import { injectedWallet, metaMaskWallet, coinbaseWallet } from '@rainbow-me/rainbowkit/wallets'
import '@rainbow-me/rainbowkit/styles.css'

const BASE_RPC = process.env.NEXT_PUBLIC_BASE_RPC || 'https://mainnet.base.org'
const BASE_SEPOLIA_RPC =
  process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC || 'https://sepolia.base.org'

// Use the WalletConnect-standard env var name (set this in .env.local)
const WC_PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID

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

// If WC_PROJECT_ID is missing, we avoid WalletConnect entirely to prevent relay spam.
const connectors = connectorsForWallets([
  {
    groupName: 'Wallets',
    wallets: [
      injectedWallet({ chains }),
      metaMaskWallet({ chains, projectId: WC_PROJECT_ID ?? 'DISABLED' }),
      coinbaseWallet({ appName: 'Base Gold Rush', chains }),
      // NOTE: no walletConnectWallet unless WC_PROJECT_ID exists
    ],
  },
])

const wagmiConfig = createConfig({
  autoConnect: true,
  connectors: WC_PROJECT_ID
    ? connectorsForWallets([
        {
          groupName: 'Wallets',
          wallets: [
            injectedWallet({ chains }),
            metaMaskWallet({ chains, projectId: WC_PROJECT_ID }),
            coinbaseWallet({ appName: 'Base Gold Rush', chains }),
            // If you want WalletConnect back, add:
            // walletConnectWallet({ chains, projectId: WC_PROJECT_ID }),
          ],
        },
      ])
    : connectors,
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
