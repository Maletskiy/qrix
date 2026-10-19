import { t } from "./i18n";
import type { DictKey } from "./i18n/ru";

export type PaymentParams = {
  address: string;
  amount: string;
  label: string;
  message: string;
  /** true — платёжный запрос по стандарту (BIP-21 / ERC-681), false — просто адрес */
  uriMode: boolean;
};

export type Coin = {
  id: string;
  name: string;
  symbol: string;
  network: string;
  accent: string;
  logo: string;
  placeholder: string;
  /** Поддерживает ли платёжный URI по стандарту */
  uri: "bip21" | "erc681" | "solana-pay" | "ton" | "none";
  amountUnit: string;
  decimals: number;
  pattern: RegExp;
  hintKey: DictKey;
  noteKey?: DictKey;
};

export const COINS: Coin[] = [
  {
    id: "btc",
    logo: "/coins/btc.svg",
    name: "Bitcoin",
    symbol: "BTC",
    network: "Bitcoin",
    accent: "#f7931a",
    placeholder: "bc1q… / 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
    uri: "bip21",
    amountUnit: "BTC",
    decimals: 8,
    pattern: /^(bc1[a-z0-9]{25,62}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$/,
    hintKey: "hint.btc",
  },
  {
    id: "eth",
    logo: "/coins/eth.svg",
    name: "Ethereum",
    symbol: "ETH",
    network: "Ethereum",
    accent: "#8a92b2",
    placeholder: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
    uri: "erc681",
    amountUnit: "ETH",
    decimals: 18,
    pattern: /^0x[a-fA-F0-9]{40}$/,
    hintKey: "hint.hex",
  },
  {
    id: "usdt-trc20",
    logo: "/coins/usdt-trc20.svg",
    name: "Tether USD",
    symbol: "USDT",
    network: "TRC-20 · Tron",
    accent: "#009393",
    placeholder: "TQ5NMqJjvHwBUqzLzMFvQxJmD1Fk9tTq3k",
    uri: "none",
    amountUnit: "USDT",
    decimals: 6,
    pattern: /^T[1-9A-HJ-NP-Za-km-z]{33}$/,
    hintKey: "hint.tron",
    noteKey: "note.tokenAddress",
  },
  {
    id: "usdt-erc20",
    logo: "/coins/usdt-erc20.svg",
    name: "Tether USD",
    symbol: "USDT",
    network: "ERC-20 · Ethereum",
    accent: "#009393",
    placeholder: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    uri: "none",
    amountUnit: "USDT",
    decimals: 6,
    pattern: /^0x[a-fA-F0-9]{40}$/,
    hintKey: "hint.hex",
    noteKey: "note.tokenAddress",
  },
  {
    id: "usdc-erc20",
    logo: "/coins/usdc-erc20.svg",
    name: "USD Coin",
    symbol: "USDC",
    network: "ERC-20 · Ethereum",
    accent: "#2775ca",
    placeholder: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    uri: "none",
    amountUnit: "USDC",
    decimals: 6,
    pattern: /^0x[a-fA-F0-9]{40}$/,
    hintKey: "hint.hex",
    noteKey: "note.tokenAddress",
  },
  {
    id: "ton",
    logo: "/coins/ton.svg",
    name: "Gram",
    symbol: "GRAM",
    network: "TON",
    accent: "#30a1f5",
    placeholder: "UQD2Bq0k… / EQD2Bq0k…",
    uri: "ton",
    amountUnit: "GRAM",
    decimals: 9,
    pattern: /^([EUk]Q[A-Za-z0-9_-]{44}|0:[a-fA-F0-9]{64})$/,
    hintKey: "hint.ton",
  },
  {
    id: "trx",
    logo: "/coins/trx.svg",
    name: "TRON",
    symbol: "TRX",
    network: "Tron",
    accent: "#eb0029",
    placeholder: "TQ5NMqJjvHwBUqzLzMFvQxJmD1Fk9tTq3k",
    uri: "none",
    amountUnit: "TRX",
    decimals: 6,
    pattern: /^T[1-9A-HJ-NP-Za-km-z]{33}$/,
    hintKey: "hint.tron",
  },
  {
    id: "sol",
    logo: "/coins/sol.svg",
    name: "Solana",
    symbol: "SOL",
    network: "Solana",
    accent: "#9945ff",
    placeholder: "9xQeWvG816bUx9EPa2r9VuQ2kK6t1v1g4u1nWBq3sGzY",
    uri: "solana-pay",
    amountUnit: "SOL",
    decimals: 9,
    pattern: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
    hintKey: "hint.sol",
  },
  {
    id: "bnb",
    logo: "/coins/bnb.svg",
    name: "BNB",
    symbol: "BNB",
    network: "BNB Smart Chain",
    accent: "#f3ba2f",
    placeholder: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
    uri: "none",
    amountUnit: "BNB",
    decimals: 18,
    pattern: /^0x[a-fA-F0-9]{40}$/,
    hintKey: "hint.hex",
  },
  {
    id: "ltc",
    logo: "/coins/ltc.svg",
    name: "Litecoin",
    symbol: "LTC",
    network: "Litecoin",
    accent: "#9b9aa9",
    placeholder: "ltc1q… / LdP8Qox1VAhCzLJNqrr74YovaWYyNBUWvL",
    uri: "bip21",
    amountUnit: "LTC",
    decimals: 8,
    pattern: /^(ltc1[a-z0-9]{25,62}|[LM3][a-km-zA-HJ-NP-Z1-9]{25,34})$/,
    hintKey: "hint.ltc",
  },
  {
    id: "doge",
    logo: "/coins/doge.svg",
    name: "Dogecoin",
    symbol: "DOGE",
    network: "Dogecoin",
    accent: "#c2a633",
    placeholder: "D8vFz4p1L37RUcHCMeD1WPnQKhBzGLBm4y",
    uri: "bip21",
    amountUnit: "DOGE",
    decimals: 8,
    pattern: /^D[5-9A-HJ-NP-Za-km-z]{33}$/,
    hintKey: "hint.doge",
  },
  {
    id: "xrp",
    logo: "/coins/xrp.svg",
    name: "XRP",
    symbol: "XRP",
    network: "XRP Ledger",
    accent: "#25a768",
    placeholder: "rN7n7otQDd6FczFgLdSqtcsAUxDkw6fzRH",
    uri: "none",
    amountUnit: "XRP",
    decimals: 6,
    pattern: /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/,
    hintKey: "hint.xrp",
  },
  {
    id: "ada",
    logo: "/coins/ada.svg",
    name: "Cardano",
    symbol: "ADA",
    network: "Cardano",
    accent: "#0033ad",
    placeholder: "addr1qxy…",
    uri: "none",
    amountUnit: "ADA",
    decimals: 6,
    pattern: /^addr1[a-z0-9]{50,}$/,
    hintKey: "hint.ada",
  },
  {
    id: "pol",
    logo: "/coins/pol.svg",
    name: "Polygon",
    symbol: "POL",
    network: "Polygon",
    accent: "#8247e5",
    placeholder: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
    uri: "none",
    amountUnit: "POL",
    decimals: 18,
    pattern: /^0x[a-fA-F0-9]{40}$/,
    hintKey: "hint.hex",
  },
  {
    id: "xmr",
    logo: "/coins/xmr.svg",
    name: "Monero",
    symbol: "XMR",
    network: "Monero",
    accent: "#ff6600",
    placeholder: "4AdUndXHHZ6cfufTMvppY6JwXNouMBzSkbLYfpAV5Usx3skxNgYeYTRj5UzqtReoS44qo9mtmXCqY45DJ852K5Jv2bYXZKKQePHES9khPK",
    uri: "none",
    amountUnit: "XMR",
    decimals: 12,
    pattern: /^[48][1-9A-HJ-NP-Za-km-z]{94}$/,
    hintKey: "hint.xmr",
  },
];

export const COIN_SCHEME: Record<string, string> = {
  bip21: "BIP-21",
  erc681: "ERC-681",
  "solana-pay": "Solana Pay",
  ton: "TON Connect",
  none: "address only",
};

export function coinById(id: string): Coin {
  return COINS.find((c) => c.id === id) ?? COINS[0];
}

/** Переводит десятичную сумму в минимальные единицы (wei, satoshi, nano и т. п.). */
export function toBaseUnits(amount: string, decimals: number): string | null {
  const clean = amount.trim().replace(",", ".");
  if (!/^\d*\.?\d*$/.test(clean) || clean === "" || clean === ".") return null;
  const [intPart, fracRaw = ""] = clean.split(".");
  if (fracRaw.length > decimals) return null;
  const frac = fracRaw.padEnd(decimals, "0");
  try {
    const value = BigInt(intPart || "0") * 10n ** BigInt(decimals) + BigInt(frac || "0");
    return value.toString();
  } catch {
    return null;
  }
}

function q(params: Record<string, string>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value) parts.push(`${key}=${encodeURIComponent(value)}`);
  }
  return parts.length ? `?${parts.join("&")}` : "";
}

export type BuildResult = { value: string; scheme: string; note?: string };

export function buildCryptoPayload(coin: Coin, p: PaymentParams): BuildResult {
  const address = p.address.trim();

  if (!address) {
    return { value: "", scheme: "address", note: t("note.emptyAddress") };
  }

  if (!p.uriMode || coin.uri === "none") {
    return {
      value: address,
      scheme: "address",
      note:
        coin.uri === "none"
          ? t("note.addressOnly")
          : t("note.addressOnlyCompat"),
    };
  }

  if (coin.uri === "bip21") {
    const value = `${coin.id === "btc" ? "bitcoin" : coin.id}:${address}${q({
      amount: p.amount.trim().replace(",", "."),
      label: p.label.trim(),
      message: p.message.trim(),
    })}`;
    return { value, scheme: "BIP-21", note: t("note.bip21", { unit: coin.amountUnit }) };
  }

  if (coin.uri === "erc681") {
    const wei = p.amount.trim() ? toBaseUnits(p.amount, 18) : null;
    const value = `ethereum:${address}${p.amount.trim() && wei ? `@1?value=${wei}` : ""}`;
    return {
      value,
      scheme: "ERC-681",
      note: wei ? t("note.erc681Value") : t("note.erc681NoValue"),
    };
  }

  if (coin.uri === "solana-pay") {
    const value = `solana:${address}${q({
      amount: p.amount.trim().replace(",", "."),
      label: p.label.trim(),
      message: p.message.trim(),
    })}`;
    return { value, scheme: "Solana Pay", note: t("note.solanaPay") };
  }

  if (coin.uri === "ton") {
    const nano = p.amount.trim() ? toBaseUnits(p.amount, 9) : null;
    const value = `ton://transfer/${address}${q({ amount: nano ?? "", text: p.message.trim() })}`;
    return {
      value,
      scheme: "TON",
      note: nano ? t("note.tonValue") : t("note.tonNoValue"),
    };
  }

  return { value: address, scheme: "address" };
}

export type AddressCheck = "empty" | "valid" | "invalid";

export function checkAddress(coin: Coin, address: string): AddressCheck {
  const value = address.trim();
  if (!value) return "empty";
  return coin.pattern.test(value) ? "valid" : "invalid";
}
