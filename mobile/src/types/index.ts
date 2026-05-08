export type UserRole = "farmer" | "buyer" | "admin";

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
}

export type CropGrade = "A" | "B" | "C" | "ungraded";

export interface SensorReading {
  id: string;
  temperature: number | null;
  humidity: number | null;
  soil_moisture: number | null;
  ph: number | null;
  is_anomaly: boolean;
  anomaly_description: string | null;
  recorded_at: string;
}

export interface GradingResult {
  grade: CropGrade;
  confidence: number;
  grade_a_prob: number;
  grade_b_prob: number;
  grade_c_prob: number;
}

export interface DiagnosisResult {
  disease_name: string;
  confidence: number;
  recommendation: string;
  is_healthy: boolean;
}
