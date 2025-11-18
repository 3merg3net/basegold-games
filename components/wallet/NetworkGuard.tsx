// components/wallet/NetworkGuard.tsx
"use client";

import { ReactNode } from "react";
import { useNetwork, useSwitchNetwork } from "wagmi";
import { ACTIVE_CHAIN } from "@/config/network";
import { IS_DEMO } from "@/config/env";

type Props = {
  children: ReactNode;
};

export function NetworkGuard({ children }: Props) {
  const { chain } = useNetwork();
  const { switchNetwork } = useSwitchNetwork();

  const correctChain = chain?.id === ACTIVE_CHAIN.id;

  if (!correctChain) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center gap-4">
        <h2 className="text-2xl font-semibold">
          {IS_DEMO ? "Testnet Demo Only" : "Wrong Network"}
        </h2>
        <p className="text-sm text-neutral-400 max-w-md">
          {IS_DEMO ? (
            <>
              Base Gold Rush is currently running as a{" "}
              <span className="font-semibold">testnet demo</span>. Please switch
              your wallet to{" "}
              <span className="font-semibold">Sepolia Testnet</span> to
              continue. No real BGLD or real-value tokens are used in this
              environment.
            </>
          ) : (
            <>
              Please connect to{" "}
              <span className="font-semibold">Base Mainnet</span> in your
              wallet to play games with BGRC chips.
            </>
          )}
        </p>
        {switchNetwork && (
          <button
            onClick={() => switchNetwork(ACTIVE_CHAIN.id)}
            className="px-4 py-2 rounded-lg border border-yellow-500/60 text-yellow-200 text-sm hover:bg-yellow-500/10 transition"
          >
            Switch to {ACTIVE_CHAIN.name}
          </button>
        )}
      </div>
    );
  }

  return <>{children}</>;
}
