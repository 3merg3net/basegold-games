'use client';

import WalletBar from './WalletBar';

export default function RootClient({ children }: { children: React.ReactNode }) {
  return (
    <>
      <WalletBar />
      <main className="mx-auto min-h-screen max-w-6xl px-4 pb-16 pt-4">
        {children}
      </main>
    </>
  );
}
