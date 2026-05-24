import api from "./api";
import type { Crop } from "../types";

export interface PricePoint {
  date: string;
  price: number;
}

export interface CommodityPriceHistory {
  commodity: string;
  unit: string;
  currentPrice: number;
  changePercent: number;
  data: PricePoint[];
}

const FALLBACK_COMMODITIES = ["Kangkung", "Bayam", "Cabai", "Tomat", "Bawang Merah"];

const BASE_PRICES: Record<string, number> = {
  Kangkung: 3500,
  Bayam: 4000,
  Cabai: 25000,
  Tomat: 8000,
  "Bawang Merah": 35000,
};

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function generateMockHistory(commodity: string, days: number): CommodityPriceHistory {
  const base = BASE_PRICES[commodity] ?? 5000;
  const rand = seededRandom(commodity.charCodeAt(0) * 31);

  const data: PricePoint[] = [];
  let price = base;

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const label = `${d.getDate()}/${d.getMonth() + 1}`;
    const delta = Math.round((rand() - 0.5) * base * 0.1);
    price = Math.max(Math.round(base * 0.7), Math.min(Math.round(base * 1.3), price + delta));
    data.push({ date: label, price });
  }

  const first = data[0].price;
  const last = data[data.length - 1].price;
  const changePercent = Math.round(((last - first) / first) * 100 * 10) / 10;

  return { commodity, unit: "kg", currentPrice: last, changePercent, data };
}

export async function getCommodityList(): Promise<string[]> {
  try {
    const res = await api.get<Crop[]>("/marketplace/crops");
    const names = [...new Set(res.data.map((c) => c.name))];
    return names.length > 0 ? names : FALLBACK_COMMODITIES;
  } catch (err: any) {
    if (__DEV__) console.error("🔧 [commodityService.getCommodityList] Failed:", err?.message ?? err);
    return FALLBACK_COMMODITIES;
  }
}

export async function getCommodityPriceHistory(
  commodity: string,
  days = 7
): Promise<CommodityPriceHistory> {
  try {
    const res = await api.get<Crop[]>("/marketplace/crops");
    const match = res.data.find((c) => c.name === commodity);

    if (match) {
      const history = generateMockHistory(commodity, days);
      // Override last price with actual listing price if available
      history.data[history.data.length - 1].price = Math.round(match.price_per_kg);
      history.currentPrice = Math.round(match.price_per_kg);
      return history;
    }
  } catch (err: any) {
    if (__DEV__) console.error("🔧 [commodityService.getCommodityPriceHistory] Failed:", err?.message ?? err);
    // fall through
  }

  return generateMockHistory(commodity, days);
}
