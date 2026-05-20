import axios from "axios";
import * as SecureStore from "expo-secure-store";
import type { GradingResult, DiagnosisResult, SensorReading } from "../types";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://192.168.1.100:8000/api/v1";

const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const authApi = {
  login: async (email: string, password: string) => {
    const res = await api.post("/auth/login", { email, password });
    await SecureStore.setItemAsync("access_token", res.data.access_token);
    return res.data;
  },
  logout: async () => {
    await SecureStore.deleteItemAsync("access_token");
  },
};

export const aiApi = {
  gradeCrop: async (cropId: string, imageUri: string): Promise<GradingResult> => {
    const form = new FormData();
    form.append("file", { uri: imageUri, name: "crop.jpg", type: "image/jpeg" } as unknown as Blob);
    const res = await api.post(`/ai/grade/${cropId}`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },
  diagnose: async (imageUri: string): Promise<DiagnosisResult> => {
    const form = new FormData();
    form.append("file", { uri: imageUri, name: "plant.jpg", type: "image/jpeg" } as unknown as Blob);
    const res = await api.post("/ai/diagnose", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },
  /** Get LLM-generated insight for a disease diagnosis result */
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
    } catch {
      return "";
    }
  },
  /** Get LLM-generated insight for grading result */
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
    } catch {
      return "";
    }
  },
  /** Get LLM-generated insight for sensor readings */
  getSensorInsight: async (sensorData: {
    temperature?: number | null;
    humidity?: number | null;
    soil_moisture?: number | null;
    ph?: number | null;
  }): Promise<string> => {
    try {
      const res = await api.post("/ai/insight/sensor", sensorData);
      return res.data.insight;
    } catch {
      return "";
    }
  },
};

export const sensorApi = {
  getReadings: async (nodeId: string, limit = 20): Promise<SensorReading[]> => {
    const res = await api.get(`/sensors/nodes/${nodeId}/readings`, { params: { limit } });
    return res.data;
  },
  listNodes: async () => {
    const res = await api.get("/sensors/nodes");
    return res.data;
  },
};

export const marketplaceApi = {
  listCrops: async () => {
    const res = await api.get("/marketplace/crops");
    return res.data;
  },
  getPrices: async () => {
    const res = await api.get("/marketplace/prices");
    return res.data;
  },
};

export default api;
