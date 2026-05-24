import axios from "axios";
import type { TokenResponse, Crop, CropInput, CropUpdateInput, OrderStatus, SensorNode, SensorReading, Transaction, User } from "@/types";

function getRequiredBaseUrl() {
  const value = process.env.NEXT_PUBLIC_API_URL;
  if (!value) {
    throw new Error("NEXT_PUBLIC_API_URL is required. Set it to the backend API URL, e.g. http://localhost:8000/api/v1.");
  }
  return value;
}

const BASE_URL = getRequiredBaseUrl();

const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("access_token");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export const authApi = {
  login: (email: string, password: string) =>
    api.post<TokenResponse>("/auth/login", { email, password }).then((r) => r.data),
  register: (data: { email: string; password: string; full_name: string; role: string }) =>
    api.post<TokenResponse>("/auth/register", data).then((r) => r.data),
  me: () => api.get<User>("/auth/me").then((r) => r.data),
};

export const marketplaceApi = {
  listCrops: (availableOnly = true) =>
    api.get<Crop[]>("/marketplace/crops", { params: { available_only: availableOnly } }).then((r) => r.data),
  getCrop: (id: string) => api.get<Crop>(`/marketplace/crops/${id}`).then((r) => r.data),
  createCrop: (data: CropInput) => api.post<Crop>("/marketplace/crops", data).then((r) => r.data),
  updateCrop: (id: string, data: CropUpdateInput) =>
    api.patch<Crop>(`/marketplace/crops/${id}`, data).then((r) => r.data),
  uploadCropImage: (id: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post<Crop>(`/marketplace/crops/${id}/image`, formData).then((r) => r.data);
  },
  getPrices: () => api.get("/marketplace/prices").then((r) => r.data),
};

export const sensorApi = {
  listNodes: () => api.get<SensorNode[]>("/sensors/nodes").then((r) => r.data),
  getReadings: (nodeId: string, limit = 50) =>
    api.get<SensorReading[]>(`/sensors/nodes/${nodeId}/readings`, { params: { limit } }).then((r) => r.data),
  registerNode: (data: { device_id: string; name: string; location?: string }) =>
    api.post<SensorNode>("/sensors/nodes", data).then((r) => r.data),
};

export const transactionApi = {
  listOrders: () => api.get<Transaction[]>("/transactions/orders").then((r) => r.data),
  createOrder: (cropId: string, quantityKg: number, idempotencyKey: string, notes?: string) =>
    api.post<Transaction>(
      "/transactions/orders",
      { crop_id: cropId, quantity_kg: quantityKg, notes },
      { headers: { "Idempotency-Key": idempotencyKey } }
    ).then((r) => r.data),
  updateOrderStatus: (orderId: string, status: OrderStatus) =>
    api.patch<Transaction>(`/transactions/orders/${orderId}/status`, null, { params: { new_status: status } }).then((r) => r.data),
};

export function getUploadUrl(path: string | null | undefined) {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const apiUrl = new URL(BASE_URL);
  return `${apiUrl.origin}${path}`;
}

export default api;
