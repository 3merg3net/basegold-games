'use client';

import React from 'react';
import Image from 'next/image';

type PokerCardProps = {
  card: string;              // e.g. "As", "Td"
  size?: 'small' | 'medium';
  highlight?: boolean;
};

export default function PokerCard({
  card,
  size = 'medium',
  highlight = false,
}: PokerCardProps) {
  // You can swap this for your real sprite logic later.
  // For now, just render a stylized rectangle with the card text.
  const sizeClasses =
    size === 'small'
      ? 'h-8 w-6 text-[10px]'
      : 'h-12 w-8 text-[12px]';

  return (
    <div
      className={[
        'flex items-center justify-center rounded-[6px] border font-mono',
        'bg-white text-black shadow-[0_0_8px_rgba(0,0,0,0.8)]',
        sizeClasses,
        highlight
          ? 'border-yellow-300 shadow-[0_0_12px_rgba(250,204,21,0.9)]'
          : 'border-slate-300',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {card}
    </div>
  );
}
