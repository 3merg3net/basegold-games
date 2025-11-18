// config/env.ts
export const ENV = process.env.NEXT_PUBLIC_ENV ?? "demo"; // "demo" | "prod"

export const IS_DEMO = ENV !== "prod";
export const IS_PROD = ENV === "prod";

export const CHAIN_ID = Number(
  process.env.NEXT_PUBLIC_CHAIN_ID ?? "11155111" // Sepolia default
);
