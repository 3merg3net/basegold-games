'use client'
import { PropsWithChildren } from 'react'
import { WagmiConfig, configureChains, createConfig } from 'wagmi'
import { base, baseSepolia } from 'wagmi/chains'
import { publicProvider } from 'wagmi/providers/public'
import { jsonRpcProvider } from 'wagmi/providers/jsonRpc'
import {
  getDefaultWallets,
  RainbowKitProvider,
  darkTheme,
} from '@rainbow-me/rainbowkit'

// Read your existing env var, with a fallback to the alt name
const projectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ??
  process.env.NEXT_PUBLIC_WC_PROJECT_ID ??
  ''

// Prefer explicit RPCs; falls back to each chain's default
const { chains, publicClient, webSocketPublicClient } = configureChains(
  [baseSepolia, base],
  [
    jsonRpcProvider({
      rpc: (chain) => ({ http: chain.rpcUrls.default.http[0] }),
    }),
    publicProvider(),
  ]
)

const { connectors } = getDefaultWallets({
  appName: process.env.NEXT_PUBLIC_PROJECT_NAME || 'Base Gold Rush',
  projectId,
  chains,
})

const wagmiConfig = createConfig({
  autoConnect: true,
  connectors,
  publicClient,
  webSocketPublicClient,
})

export default function Providers({ children }: PropsWithChildren) {
  return (
    <WagmiConfig config={wagmiConfig}>
      <RainbowKitProvider
        chains={chains}
        theme={darkTheme({
          accentColor: '#FFD700',
          accentColorForeground: '#000',
          borderRadius: 'large',
          overlayBlur: 'small',
        })}
      >
        {children}
      </RainbowKitProvider>
    </WagmiConfig>
  )
}
