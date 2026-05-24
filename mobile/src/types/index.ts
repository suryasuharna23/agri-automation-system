export type UserRole = 'farmer' | 'buyer' | 'admin';

export interface User {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: UserRole;
  is_active: boolean;
  bank_account: string | null;
  bank_name: string | null;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export type CropGrade = 'A' | 'B' | 'C' | 'ungraded';

export interface Crop {
  id: string;
  farmer_id: string;
  name: string;
  variety: string | null;
  quantity_kg: number;
  price_per_kg: number;
  grade: CropGrade;
  grade_confidence: number | null;
  image_url: string | null;
  description: string | null;
  is_available: boolean;
  harvest_date: string | null;
  created_at: string;
}

export interface SensorNode {
  id: string;
  device_id: string;
  name: string;
  location: string | null;
  is_active: boolean;
  last_seen: string | null;
  created_at: string;
}

export interface SensorReading {
  id: string;
  node_id: string;
  temperature: number | null;
  humidity: number | null;
  soil_moisture: number | null;
  ph: number | null;
  is_anomaly: boolean;
  anomaly_description: string | null;
  recorded_at: string;
}

export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'completed' | 'cancelled';

export interface Transaction {
  id: string;
  crop_id: string;
  seller_id: string;
  buyer_id: string;
  quantity_kg: number;
  price_per_kg: number;
  total_amount: number;
  status: OrderStatus;
  payment_reference: string | null;
  notes: string | null;
}

export interface GradingResult {
  crop_id: string;
  grade: CropGrade;
  confidence: number;
  grade_a_prob: number;
  grade_b_prob: number;
  grade_c_prob: number;
  mode?: 'model' | 'demo_fallback';
}

export interface DiagnosisResult {
  disease_name: string;
  confidence: number;
  recommendation: string;
  is_healthy: boolean;
  mode?: 'model' | 'demo_fallback';
  record_id?: string;
}

export interface InsightResponse {
  insight: string;
  mode?: 'model' | 'demo_fallback';
}
