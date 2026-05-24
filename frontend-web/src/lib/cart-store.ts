"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Crop } from "@/types";

export type CartItem = {
  cropId: string;
  name: string;
  quantityKg: number;
  pricePerKg: number;
  stockKg: number;
  imageUrl: string | null;
  farmerId: string;
};

type CartState = {
  items: CartItem[];
  addItem: (crop: Crop, quantityKg: number) => void;
  updateQuantity: (cropId: string, quantityKg: number) => void;
  removeItem: (cropId: string) => void;
  clearItem: (cropId: string) => void;
  clearCart: () => void;
};

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      addItem: (crop, quantityKg) =>
        set((state) => {
          const existing = state.items.find((item) => item.cropId === crop.id);
          const nextQuantity = Math.min((existing?.quantityKg ?? 0) + quantityKg, crop.quantity_kg);

          if (existing) {
            return {
              items: state.items.map((item) =>
                item.cropId === crop.id
                  ? {
                      ...item,
                      quantityKg: nextQuantity,
                      pricePerKg: crop.price_per_kg,
                      stockKg: crop.quantity_kg,
                      imageUrl: crop.image_url,
                    }
                  : item
              ),
            };
          }

          return {
            items: [
              ...state.items,
              {
                cropId: crop.id,
                name: crop.name,
                quantityKg: Math.min(quantityKg, crop.quantity_kg),
                pricePerKg: crop.price_per_kg,
                stockKg: crop.quantity_kg,
                imageUrl: crop.image_url,
                farmerId: crop.farmer_id,
              },
            ],
          };
        }),
      updateQuantity: (cropId, quantityKg) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.cropId === cropId ? { ...item, quantityKg: Math.max(1, Math.min(quantityKg, item.stockKg)) } : item
          ),
        })),
      removeItem: (cropId) => set((state) => ({ items: state.items.filter((item) => item.cropId !== cropId) })),
      clearItem: (cropId) => set((state) => ({ items: state.items.filter((item) => item.cropId !== cropId) })),
      clearCart: () => set({ items: [] }),
    }),
    { name: "agri_cart" }
  )
);
