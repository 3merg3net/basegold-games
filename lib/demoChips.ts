// lib/demoChips.ts
export type DemoBalances = {
  gld: number;
  pgld: number;
};

// v2 key because structure changed (bgrc -> gld+pgld)
const KEY = "bgr_demo_balances_v2";

export function getDemoBalances(): DemoBalances {
  if (typeof window === "undefined") return { gld: 0, pgld: 0 };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { gld: 0, pgld: 0 };
    const parsed = JSON.parse(raw);

    return {
      gld: Number(parsed?.gld ?? 0),
      pgld: Number(parsed?.pgld ?? 0),
    };
  } catch {
    return { gld: 0, pgld: 0 };
  }
}

export function setDemoBalances(balances: DemoBalances) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(balances));
}
