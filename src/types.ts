export interface LKAState {
  timestamp: number;
  lateralOffset: number; // in meters
  steeringAngle: number; // in degrees
  velocity: number; // m/s
  heading: number; // rad
  laneCenter: number; // relative 0-1
  vehicleCenter: number; // relative 0-1
  confidence: number; // 0-1
  gnssNoise: number;
  imuDrift: number;
  isSafe: boolean;
}

export interface SimulationParams {
  visibility: number; // 0-1
  windSpeed: number; // km/h
  noiseLevel: number; // 0-1
}

export interface FrameData {
  image: string; // base64
  params: SimulationParams;
}

export interface ProcessedFrame {
  overlay: string; // base64 or instructions
  metrics: LKAState;
}
