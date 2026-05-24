import axios from "axios";
import * as SecureStore from "expo-secure-store";
import type {
  Crop,
  CropInput,
  CropUpdateInput,
  DiagnosisResult,
  GradingResult,
  OrderStatus,
  SensorNode,
  SensorReading,
  Transaction,
  User,
} from "../types";

const debugLog = (...args: unknown[]) => {
  if (__DEV__) console.log(...args);
};

const debugWarn = (...args: unknown[]) => {
  if (__DEV__) console.warn(...args);
};

const debugError = (...args: unknown[]) => {
  if (__DEV__) console.error(...args);
};
const summarizeResponseData = (data: unknown) => {
  if (Array.isArray(data)) {
    return `array(${data.length})`;
  }
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    const keys = Object.keys(record);
    const safeSummary: Record<string, unknown> = { keys };
    for (const key of ["id", "mode", "grade", "disease_name", "confidence", "is_healthy", "status"]) {
      if (key in record) safeSummary[key] = record[key];
    }
    if ("access_token" in record || "refresh_token" in record) {
      safeSummary.authenticated = true;
    }
    if ("insight" in record && typeof record.insight === "string") {
      safeSummary.insight_length = record.insight.length;
    }
    return JSON.stringify(safeSummary);
  }
  return String(data);
};

// ─────────────────────────────────────────────────────
// DEBUG: Log the resolved BASE_URL at module load time
// ─────────────────────────────────────────────────────
function getRequiredBaseUrl() {
  const value = process.env.EXPO_PUBLIC_API_URL;
  if (!value) {
    throw new Error(
      "EXPO_PUBLIC_API_URL is required. Set it to the backend API URL using the computer LAN IP, e.g. http://192.168.1.100:8000/api/v1."
    );
  }
  return value;
}

const BASE_URL = getRequiredBaseUrl();
debugLog("🔧 [api.ts] EXPO_PUBLIC_API_URL =", process.env.EXPO_PUBLIC_API_URL);
debugLog("🔧 [api.ts] Resolved BASE_URL   =", BASE_URL);

const api = axios.create({ baseURL: BASE_URL });

let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

export function getUploadUrl(path: string | null | undefined) {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("file://")) return path;
  const apiUrl = new URL(BASE_URL);
  return `${apiUrl.origin}${path}`;
}

// ─────────────────────────────────────────────────────
// DEBUG: Request interceptor — log every outgoing call
// ─────────────────────────────────────────────────────
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync("access_token");
  config.baseURL = config.baseURL ?? "";
  config.url = config.url ?? "";
  debugLog("🔧 [api.ts] Request:", config.method?.toUpperCase(), config.url);
  debugLog("🔧 [api.ts]   Has token in SecureStore:", !!token);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    debugWarn("🔧 [api.ts]   ⚠️  No token found in SecureStore — request will likely get 401/403");
  }

  // Log FormData info for multipart uploads
  if (config.data instanceof FormData) {
    const parts: { name?: string; uri?: string; type?: string }[] = [];
    // @ts-ignore — FormData.entries() available in RN
    for (const pair of config.data._parts || config.data.entries?.() || []) {
      const val = pair[1];
      if (typeof val === "object" && val !== null) {
        parts.push({
          name: pair[0],
          uri: (val as any).uri,
          type: (val as any).type,
        });
      } else {
        parts.push({ name: pair[0], type: typeof val });
      }
    }
    debugLog("[api.ts]   FormData part count:", parts.length);
    // Log the content-type header (auto-set by axios with boundary)
    debugLog("🔧 [api.ts]   Content-Type:", config.headers["Content-Type"] || "auto");
  }

  return config;
});

// ─────────────────────────────────────────────────────
// DEBUG: Response/Error interceptor
// ─────────────────────────────────────────────────────
api.interceptors.response.use(
  (response) => {
    debugLog(
      "🔧 [api.ts] Response:",
      response.status,
      response.config.method?.toUpperCase(),
      response.config.url
    );
    debugLog("[api.ts]   Data:", summarizeResponseData(response.data));
    return response;
  },
  (error) => {
    if (error.response) {
      // Server responded with error status
      debugError(
        "🔧 [api.ts] ❌ Error Response:",
        error.response.status,
        error.config?.method?.toUpperCase(),
        error.config?.url
      );
      debugError("[api.ts]   Detail:", error.response.data?.detail ?? error.message);
      if (error.response.status === 401) {
        SecureStore.deleteItemAsync("access_token").catch(() => {});
        SecureStore.deleteItemAsync("user").catch(() => {});
        unauthorizedHandler?.();
      }
    } else if (error.request) {
      // No response received (network error / timeout / wrong host)
      debugError(
        "🔧 [api.ts] ❌ Network Error — no response received for:",
        error.config?.method?.toUpperCase(),
        error.config?.url
      );
      debugError("🔧 [api.ts]   Error message:", error.message);
      debugError("🔧 [api.ts]   Error code:", error.code);
    } else {
      debugError("🔧 [api.ts] ❌ Unknown Error:", error.message);
    }
    return Promise.reject(error);
  }
);

// ─────────────────────────────────────────────────────
// API function groups
// ─────────────────────────────────────────────────────

export const authApi = {
  login: async (email: string, password: string) => {
    debugLog("🔧 [authApi.login] Attempting login for:", email);
    const res = await api.post("/auth/login", { email, password });
    await SecureStore.setItemAsync("access_token", res.data.access_token);
    debugLog("🔧 [authApi.login] Token stored, user:", res.data.user?.full_name, "role:", res.data.user?.role);
    return res.data;
  },
  register: async (payload: { email: string; password?: string; full_name: string; phone?: string; role: string }) => {
    debugLog("🔧 [authApi.register] Registering:", payload.email, "role:", payload.role);
    const res = await api.post("/auth/register", payload);
    await SecureStore.setItemAsync("access_token", res.data.access_token);
    debugLog("🔧 [authApi.register] Token stored, user:", res.data.user?.full_name, "role:", res.data.user?.role);
    return res.data;
  },
  me: async (): Promise<User> => {
    const res = await api.get("/auth/me");
    await SecureStore.setItemAsync("user", JSON.stringify(res.data));
    return res.data;
  },
  updateMe: async (payload: { full_name?: string; phone?: string }) => {
    const res = await api.patch("/auth/me", payload);
    return res.data;
  },
  logout: async () => {
    debugLog("🔧 [authApi.logout] Deleting token from SecureStore");
    await SecureStore.deleteItemAsync("access_token");
  },
};

export const aiApi = {
  gradeCrop: async (cropId: string, imageUri: string): Promise<GradingResult> => {
    debugLog("[aiApi.gradeCrop] cropId:", cropId);
    const form = new FormData();
    form.append("file", { uri: imageUri, name: "crop.jpg", type: "image/jpeg" } as unknown as Blob);
    debugLog("[aiApi.gradeCrop] FormData prepared");
    const res = await api.post(`/ai/grade/${cropId}`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    debugLog("[aiApi.gradeCrop] Result mode:", res.data?.mode ?? "model");
    return res.data;
  },
  diagnose: async (imageUri: string): Promise<DiagnosisResult> => {
    debugLog("[aiApi.diagnose] image selected");

    const form = new FormData();
    form.append("file", { uri: imageUri, name: "plant.jpg", type: "image/jpeg" } as unknown as Blob);
    debugLog("🔧 [aiApi.diagnose] About to POST to /ai/diagnose");

    const res = await api.post("/ai/diagnose", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    debugLog("🔧 [aiApi.diagnose] Success — status:", res.status);
    debugLog("[aiApi.diagnose] Result mode:", res.data?.mode ?? "model");
    return res.data;
  },
  saveDiagnosisInsight: async (recordId: string, insight: string): Promise<void> => {
    await api.patch(`/ai/diagnoses/${recordId}/insight`, { insight });
  },
  deleteDiagnosis: async (recordId: string): Promise<void> => {
    await api.delete(`/ai/diagnoses/${recordId}`);
  },
  getDiseaseInsight: async (
    diseaseName: string,
    confidence: number,
    isHealthy: boolean,
    sensorData?: { temperature?: number | null; humidity?: number | null; soil_moisture?: number | null; ph?: number | null },
  ): Promise<string> => {
    try {
      const res = await api.post("/ai/insight/disease", {
        disease_name: diseaseName,
        confidence,
        is_healthy: isHealthy,
        sensor_data: sensorData ?? null,
      });
      return res.data.insight;
    } catch (err: any) {
      debugError("🔧 [aiApi.getDiseaseInsight] Failed:", err?.response?.status, err?.message ?? err);
      throw err;
    }
  },
  getGradingInsight: async (
    grade: string,
    confidence: number,
    gradeAProb: number,
    gradeBProb: number,
    gradeCProb: number,
    sensorData?: { temperature?: number | null; humidity?: number | null; soil_moisture?: number | null; ph?: number | null },
  ): Promise<string> => {
    try {
      const res = await api.post("/ai/insight/grading", {
        grade,
        confidence,
        grade_a_prob: gradeAProb,
        grade_b_prob: gradeBProb,
        grade_c_prob: gradeCProb,
        sensor_data: sensorData ?? null,
      });
      return res.data.insight;
    } catch (err: any) {
      debugError("🔧 [aiApi.getGradingInsight] Failed:", err?.response?.status, err?.message ?? err);
      throw err;
    }
  },
  getSensorInsight: async (sensorData: {
    temperature?: number | null;
    humidity?: number | null;
    soil_moisture?: number | null;
    ph?: number | null;
  }): Promise<{ insight: string; actions: string[] }> => {
    try {
      const res = await api.post("/ai/insight/sensor", sensorData);
      return { insight: res.data.insight ?? '', actions: res.data.actions ?? [] };
    } catch (err: any) {
      debugError("🔧 [aiApi.getSensorInsight] Failed:", err?.response?.status, err?.message ?? err);
      throw err;
    }
  },
};

export const sensorApi = {
  getReadings: async (nodeId: string, limit = 20): Promise<SensorReading[]> => {
    debugLog("🔧 [sensorApi.getReadings] nodeId:", nodeId, "limit:", limit);
    const res = await api.get(`/sensors/nodes/${nodeId}/readings`, { params: { limit } });
    debugLog("🔧 [sensorApi.getReadings] Count:", res.data?.length);
    return res.data;
  },
  listNodes: async (): Promise<SensorNode[]> => {
    debugLog("🔧 [sensorApi.listNodes] Fetching sensor nodes...");
    const res = await api.get("/sensors/nodes");
    debugLog("🔧 [sensorApi.listNodes] Count:", res.data?.length);
    return res.data;
  },
  registerNode: async (payload: { device_id: string; name: string; location?: string | null }): Promise<SensorNode> => {
    const res = await api.post("/sensors/nodes", payload);
    return res.data;
  },
  deleteNode: async (nodeId: string): Promise<void> => {
    await api.delete(`/sensors/nodes/${nodeId}`);
  },
};

export const marketplaceApi = {
  listCrops: async (availableOnly = true): Promise<Crop[]> => {
    debugLog("🔧 [marketplaceApi.listCrops] Fetching crops...");
    const res = await api.get("/marketplace/crops", { params: { available_only: availableOnly } });
    debugLog("🔧 [marketplaceApi.listCrops] Count:", res.data?.length);
    return res.data;
  },
  getCrop: async (cropId: string): Promise<Crop> => {
    const res = await api.get(`/marketplace/crops/${cropId}`);
    return res.data;
  },
  createCrop: async (payload: CropInput): Promise<Crop> => {
    const res = await api.post("/marketplace/crops", payload);
    return res.data;
  },
  updateCrop: async (cropId: string, payload: CropUpdateInput): Promise<Crop> => {
    const res = await api.patch(`/marketplace/crops/${cropId}`, payload);
    return res.data;
  },
  uploadCropImage: async (cropId: string, imageUri: string): Promise<Crop> => {
    const form = new FormData();
    form.append("file", { uri: imageUri, name: "crop.jpg", type: "image/jpeg" } as unknown as Blob);
    const res = await api.post(`/marketplace/crops/${cropId}/image`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },
  deleteCrop: async (cropId: string): Promise<void> => {
    await api.delete(`/marketplace/crops/${cropId}`);
  },
  getPrices: async () => {
    debugLog("🔧 [marketplaceApi.getPrices] Fetching prices...");
    const res = await api.get("/marketplace/prices");
    debugLog("🔧 [marketplaceApi.getPrices] Response:", JSON.stringify(res.data).slice(0, 200));
    return res.data;
  },
};

export const transactionApi = {
  listOrders: async (): Promise<Transaction[]> => {
    const res = await api.get("/transactions/orders");
    return res.data;
  },
  updateOrderStatus: async (orderId: string, status: OrderStatus): Promise<Transaction> => {
    const res = await api.patch(`/transactions/orders/${orderId}/status`, null, { params: { new_status: status } });
    return res.data;
  },
  cancelOrder: async (orderId: string): Promise<Transaction> => {
    const res = await api.delete(`/transactions/orders/${orderId}`);
    return res.data;
  },
};

export default api;
