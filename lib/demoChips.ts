// lib/demoChips.ts
export type DemoBalances = {
  bgrc: number;
};

const KEY = "bgrc_demo_balances_v1";

export function getDemoBalances(): DemoBalances {
  if (typeof window === "undefined") return { bgrc: 0 };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { bgrc: 0 };
    return JSON.parse(raw);
  } catch {
    return { bgrc: 0 };
  }
}

export function setDemoBalances(balances: DemoBalances) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(balances));
}
