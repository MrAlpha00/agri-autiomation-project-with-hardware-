/**
 * Core IoT Data Models and Hardware Type Definitions
 * Smart Agriculture Monitoring and Automation System
 */

// Fixed ESP32 GPIO Hardware Pinout Definitions
export const HARDWARE_PINS = {
  SOIL_MOISTURE_ADC: 34,      // GPIO34 (Input only, ADC1_CH6)
  WATER_LEVEL_ADC: 35,        // GPIO35 (Input only, ADC1_CH7)
  LDR_LIGHT_ADC: 32,          // GPIO32 (ADC1_CH4)
  DHT11_DATA: 27,             // GPIO27 (Bidirectional single-bus)
  PIR_MOTION: 26,             // GPIO26 (Digital input, pending physical test)
  RELAY_CH1_PUMP: 18,         // GPIO18 -> HW-316 IN1 (Active-Low)
  RELAY_CH2_LED: 19,          // GPIO19 -> HW-316 IN2 (Active-Low)
  RELAY_CH3_BUZZER: 21,       // GPIO21 -> HW-316 IN3 (Active-Low)
  RELAY_CH4_SPARE: 22,        // GPIO22 -> HW-316 IN4 (Spare, kept OFF)
} as const;

export type SystemMode = 'MANUAL' | 'AUTO';

export type RelayChannel = 'PUMP' | 'LED' | 'BUZZER' | 'SPARE';

export interface RelayStates {
  pump: boolean;      // IN1 - Water Pump
  led: boolean;       // IN2 - Farm LED
  buzzer: boolean;    // IN3 - Alarm Buzzer
  spare: boolean;     // IN4 - Spare channel (always OFF)
}

export interface SensorTelemetry {
  deviceId: string;
  timestamp: string;
  temperature: number | null;    // °C from DHT11
  humidity: number | null;       // % from DHT11
  soilRaw: number;               // 0-4095 raw ADC (GPIO34)
  waterRaw: number;              // 0-4095 raw ADC (GPIO35)
  lightRaw: number;              // 0-4095 raw ADC (GPIO32)
  pirState: boolean;             // GPIO26 high/low
  wifiRssi?: number;             // dBm
  isStale?: boolean;             // Derived flag if last telemetry > 60s
}

export interface DeviceState {
  deviceId: string;
  mode: SystemMode;
  relays: RelayStates;
  firmwareVersion: string;
  lastSeen: string;
  uptimeSeconds: number;
  ipAddress?: string;
  freeHeap?: number;
  isOnline: boolean;
}

export type CommandStatus = 'QUEUED' | 'EXECUTING' | 'SUCCEEDED' | 'FAILED' | 'TIMED_OUT';

export interface DeviceCommand {
  id: string;
  deviceId: string;
  commandType: 'SET_MODE' | 'TOGGLE_RELAY' | 'EMERGENCY_STOP' | 'UPDATE_SETTINGS' | 'CALIBRATE';
  payload: Record<string, unknown>;
  requestedBy: string;
  status: CommandStatus;
  createdAt: string;
  executedAt?: string;
  errorDetails?: string;
}

export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';
export type AlertEventType = 'LOW_WATER' | 'PUMP_OVERTIME' | 'MOTION_DETECTED' | 'DEVICE_OFFLINE' | 'SENSOR_ANOMALY';

export interface AlertEvent {
  id: string;
  type: AlertEventType;
  severity: AlertSeverity;
  message: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
  acknowledged: boolean;
  acknowledgedAt?: string;
}

export interface CalibrationThresholds {
  // Soil moisture calibration (raw ADC 0-4095)
  soilAirDryRaw: number;        // Typically ~3200-3800
  soilWaterSaturatedRaw: number; // Typically ~1100-1600
  soilAutoIrrigateThresholdRaw: number; // Start irrigation if raw > this
  soilAutoStopThresholdRaw: number;      // Stop irrigation if raw < this

  // Water tank depth calibration (raw ADC 0-4095)
  waterEmptyRaw: number;        // Dry sensor
  waterFullRaw: number;         // Max immersion
  waterLowCutoffRaw: number;    // Safety pump interlock threshold

  // Pump safety
  pumpMaxRuntimeSeconds: number; // e.g. 120s max before safety cutoff
  pumpCooldownSeconds: number;   // Minimum off time between cycles
  
  // Telemetry intervals
  telemetryIntervalSeconds: number;
}

export interface CameraState {
  streamUrl: string;
  captureUrl: string;
  isOnline: boolean;
  lastSnapshotTimestamp?: string;
  resolution: string;
}
