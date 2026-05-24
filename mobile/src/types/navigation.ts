import type { CameraMode } from '../screens/CameraScreen';
import type { DiagnosisResult, GradingResult } from './index';

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Main: undefined;
  Camera: {
    mode: CameraMode;
    cropId?: string;
  };
  CameraPreview: {
    uri?: string;
    uris?: string[];
    mode: CameraMode;
    cropId?: string;
  };
  DiagnosisDetail: {
    result: DiagnosisResult | GradingResult;
    mode: 'grading' | 'diagnosis';
    imageUri: string;
    insight?: string;
    sensorData?: {
      temperature?: number | null;
      humidity?: number | null;
      soil_moisture?: number | null;
      ph?: number | null;
    };
  };
  Profile: undefined;
  CropList: undefined;
  CropDetail: {
    cropId: string;
  };
  CropForm: {
    cropId?: string;
  } | undefined;
  SensorNodeForm: undefined;
  Orders: undefined;
  Finance: undefined;
  Treatment: {
    result: DiagnosisResult;
    imageUri: string;
    sensorData?: {
      temperature?: number | null;
      humidity?: number | null;
      soil_moisture?: number | null;
      ph?: number | null;
    };
  };
};

export type MainTabParamList = {
  Dashboard: undefined;
  Notifications: undefined;
  Diagnosis: undefined;
  Monitor: undefined;
  Profile: undefined;
};
