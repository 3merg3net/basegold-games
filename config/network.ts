// config/network.ts
import { base, sepolia } from "wagmi/chains";
import { IS_DEMO } from "./env";

export const ACTIVE_CHAIN = IS_DEMO ? sepolia : base;

export const CHAIN_CONFIG = {
  demoName: "Sepolia Testnet",
  liveName: "Base Mainnet",
};
