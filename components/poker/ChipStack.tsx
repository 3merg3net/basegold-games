// components/poker/ChipStack.tsx
import React from 'react';

type ChipStackProps = {
  amount: number;
  size?: number; // base chip diameter in px
};

const ChipStack: React.FC<ChipStackProps> = ({ amount, size = 22 }) => {
  if (!amount || amount <= 0) return null;

  // How many visual chips to show (2–6)
  const chipCount = Math.min(6, Math.max(2, Math.floor(amount / 50)));
  const chips = Array.from({ length: chipCount });

  const chipHeight = size * 0.35;
  const chipWidth = size;
  const overlap = chipHeight * 0.35;

  const stackHeight = chipHeight + overlap * (chipCount - 1);

  return (
    <div
      className="relative"
      style={{ width: chipWidth + 6, height: stackHeight + 6 }}
    >
      {chips.map((_, i) => {
        const offset = i * overlap;
        return (
          <div
            key={i}
            className="absolute left-1 rounded-full border border-amber-300/90 shadow shadow-black/70"
            style={{
              bottom: offset,
              width: chipWidth,
              height: chipHeight,
              background:
                'radial-gradient(circle at 30% 30%, #FFF 0, #FFE08A 20%, #F59E0B 60%, #92400E 100%)',
            }}
          >
            {/* subtle inner ring */}
            <div
              className="absolute inset-[20%] rounded-full border border-white/60"
              style={{
                boxShadow: 'inset 0 0 4px rgba(0,0,0,0.6)',
              }}
            />
          </div>
        );
      })}
    </div>
  );
};

export default ChipStack;
