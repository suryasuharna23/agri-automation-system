import axios from "axios";
import * as SecureStore from "expo-secure-store";
import type { GradingResult, DiagnosisResult, SensorReading } from "../types";

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
console.log("🔧 [api.ts] EXPO_PUBLIC_API_URL =", process.env.EXPO_PUBLIC_API_URL);
console.log("🔧 [api.ts] Resolved BASE_URL   =", BASE_URL);

const api = axios.create({ baseURL: BASE_URL });

// ─────────────────────────────────────────────────────
// DEBUG: Request interceptor — log every outgoing call
// ─────────────────────────────────────────────────────
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync("access_token");
  config.baseURL = config.baseURL ?? "";
  config.url = config.url ?? "";
  console.log("🔧 [api.ts] Request:", config.method?.toUpperCase(), config.url);
  console.log("🔧 [api.ts]   Full URL:", config.baseURL + config.url);
  console.log("🔧 [api.ts]   Has token in SecureStore:", !!token);
  if (token) {
    console.log("🔧 [api.ts]   Token preview:", token.slice(0, 20) + "...");
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    console.warn("🔧 [api.ts]   ⚠️  No token found in SecureStore — request will likely get 401/403");
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
    console.log("🔧 [api.ts]   FormData parts:", JSON.stringify(parts, null, 2));
    // Log the content-type header (auto-set by axios with boundary)
    console.log("🔧 [api.ts]   Content-Type:", config.headers["Content-Type"] || "auto");
  }

  return config;
});

// ─────────────────────────────────────────────────────
// DEBUG: Response/Error interceptor
// ─────────────────────────────────────────────────────
api.interceptors.response.use(
  (response) => {
    console.log(
      "🔧 [api.ts] Response:",
      response.status,
      response.config.method?.toUpperCase(),
      response.config.url
    );
    // Log response data preview (first 300 chars)
    const dataStr = JSON.stringify(response.data);
    console.log(
      "🔧 [api.ts]   Data:",
      dataStr.length > 300 ? dataStr.slice(0, 300) + "..." : dataStr
    );
    return response;
  },
  (error) => {
    if (error.response) {
      // Server responded with error status
      console.error(
        "🔧 [api.ts] ❌ Error Response:",
        error.response.status,
        error.config?.method?.toUpperCase(),
        error.config?.url
      );
      console.error("🔧 [api.ts]   Response body:", JSON.stringify(error.response.data).slice(0, 500));
      console.error("🔧 [api.ts]   Full request URL:", error.config?.baseURL + error.config?.url);
      console.error("🔧 [api.ts]   Request headers:", JSON.stringify(error.config?.headers));
    } else if (error.request) {
      // No response received (network error / timeout / wrong host)
      console.error(
        "🔧 [api.ts] ❌ Network Error — no response received for:",
        error.config?.method?.toUpperCase(),
        error.config?.url
      );
      console.error("🔧 [api.ts]   Full request URL:", error.config?.baseURL + error.config?.url);
      console.error("🔧 [api.ts]   Error message:", error.message);
      console.error("🔧 [api.ts]   Error code:", error.code);
    } else {
      console.error("🔧 [api.ts] ❌ Unknown Error:", error.message);
    }
    return Promise.reject(error);
  }
);

// ─────────────────────────────────────────────────────
// API function groups
// ─────────────────────────────────────────────────────

export const authApi = {
  login: async (email: string, password: string) => {
    console.log("🔧 [authApi.login] Attempting login for:", email);
    const res = await api.post("/auth/login", { email, password });
    await SecureStore.setItemAsync("access_token", res.data.access_token);
    console.log("🔧 [authApi.login] Token stored, user:", res.data.user?.full_name, "role:", res.data.user?.role);
    return res.data;
  },
  register: async (payload: { email: string; password?: string; full_name: string; role: string }) => {
    console.log("🔧 [authApi.register] Registering:", payload.email, "role:", payload.role);
    const res = await api.post("/auth/register", payload);
    await SecureStore.setItemAsync("access_token", res.data.access_token);
    console.log("🔧 [authApi.register] Token stored, user:", res.data.user?.full_name, "role:", res.data.user?.role);
    return res.data;
  },
  logout: async () => {
    console.log("🔧 [authApi.logout] Deleting token from SecureStore");
    await SecureStore.deleteItemAsync("access_token");
  },
};

export const aiApi = {
  gradeCrop: async (cropId: string, imageUri: string): Promise<GradingResult> => {
    console.log("🔧 [aiApi.gradeCrop] cropId:", cropId, "imageUri:", imageUri);
    const form = new FormData();
    form.append("file", { uri: imageUri, name: "crop.jpg", type: "image/jpeg" } as unknown as Blob);
    console.log("🔧 [aiApi.gradeCrop] FormData prepared — field: file, uri:", imageUri);
    const res = await api.post(`/ai/grade/${cropId}`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    console.log("🔧 [aiApi.gradeCrop] Result:", JSON.stringify(res.data));
    return res.data;
  },
  diagnose: async (imageUri: string): Promise<DiagnosisResult> => {
    console.log("🔧 [aiApi.diagnose] imageUri:", imageUri);
    // Check if the URI looks valid
    console.log("🔧 [aiApi.diagnose] URI scheme:", imageUri?.split(":")[0]);
    console.log("🔧 [aiApi.diagnose] URI length:", imageUri?.length);

    const form = new FormData();
    form.append("file", { uri: imageUri, name: "plant.jpg", type: "image/jpeg" } as unknown as Blob);
    console.log("🔧 [aiApi.diagnose] About to POST to /ai/diagnose");

    const res = await api.post("/ai/diagnose", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    console.log("🔧 [aiApi.diagnose] Success — status:", res.status);
    console.log("🔧 [aiApi.diagnose] Result:", JSON.stringify(res.data));
    return res.data;
  },
  getDiseaseInsight: async (
    diseaseName: string,
    confidence: number,
    isHealthy: boolean,
    sensorData?: { temperature?: number; humidity?: number; soil_moisture?: number; ph?: number },
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
      console.error("🔧 [aiApi.getDiseaseInsight] Failed:", err?.response?.status, err?.message ?? err);
      throw err;
    }
  },
  getGradingInsight: async (
    grade: string,
    confidence: number,
    gradeAProb: number,
    gradeBProb: number,
    gradeCProb: number,
    sensorData?: { temperature?: number; humidity?: number; soil_moisture?: number; ph?: number },
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
      console.error("🔧 [aiApi.getGradingInsight] Failed:", err?.response?.status, err?.message ?? err);
      throw err;
    }
  },
  getSensorInsight: async (sensorData: {
    temperature?: number | null;
    humidity?: number | null;
    soil_moisture?: number | null;
    ph?: number | null;
  }): Promise<string> => {
    try {
      const res = await api.post("/ai/insight/sensor", sensorData);
      return res.data.insight;
    } catch (err: any) {
      console.error("🔧 [aiApi.getSensorInsight] Failed:", err?.response?.status, err?.message ?? err);
      throw err;
    }
  },
};

export const sensorApi = {
  getReadings: async (nodeId: string, limit = 20): Promise<SensorReading[]> => {
    console.log("🔧 [sensorApi.getReadings] nodeId:", nodeId, "limit:", limit);
    const res = await api.get(`/sensors/nodes/${nodeId}/readings`, { params: { limit } });
    console.log("🔧 [sensorApi.getReadings] Count:", res.data?.length);
    return res.data;
  },
  listNodes: async () => {
    console.log("🔧 [sensorApi.listNodes] Fetching sensor nodes...");
    const res = await api.get("/sensors/nodes");
    console.log("🔧 [sensorApi.listNodes] Count:", res.data?.length);
    return res.data;
  },
};

export const marketplaceApi = {
  listCrops: async () => {
    console.log("🔧 [marketplaceApi.listCrops] Fetching crops...");
    const res = await api.get("/marketplace/crops");
    console.log("🔧 [marketplaceApi.listCrops] Count:", res.data?.length);
    return res.data;
  },
  getPrices: async () => {
    console.log("🔧 [marketplaceApi.getPrices] Fetching prices...");
    const res = await api.get("/marketplace/prices");
    console.log("🔧 [marketplaceApi.getPrices] Response:", JSON.stringify(res.data).slice(0, 200));
    return res.data;
  },
};

export default api;
