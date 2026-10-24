'use client';

import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { 
  Activity, 
  Droplets, 
  Waves, 
  Thermometer, 
  Sun, 
  Radio, 
  AlertTriangle,
  Info,
  CheckCircle,
  HelpCircle
} from 'lucide-react';
import { HARDWARE_PINS } from '@/types/iot';

export default function SensorsPage() {
  const isDemo = true;

  const sensors = [
    {
      id: 'soil',
      name: 'Capacitive / Resistive Soil Moisture',
      pin: `GPIO${HARDWARE_PINS.SOIL_MOISTURE_ADC} (ADC1_CH6)`,
      rawADC: 2840,
      maxADC: 4095,
      type: 'Analog ADC',
      status: 'Adequate Moisture',
      statusColor: 'text-emerald-400',
      description: 'Measures volumetric soil water content via dielectric permittivity / resistance change.',
      calibrationNote: 'Raw value decreases as moisture increases on capacitive probes. Dry air: ~3200-3800, Saturated water: ~1200-1500.',
      isPendingTest: false
    },
    {
      id: 'water',
      name: 'Submersible Water Depth Sensor',
      pin: `GPIO${HARDWARE_PINS.WATER_LEVEL_ADC} (ADC1_CH7)`,
      rawADC: 1950,
      maxADC: 4095,
      type: 'Analog ADC',
      status: 'Tank Level OK',
      statusColor: 'text-blue-400',
      description: 'Monitors the water reservoir depth to enforce hardware pump interlock protection.',
      calibrationNote: 'Dry sensor reads ~0-200. Submerged reads ~1800-3000. Critical cutoff: Stop pump if reading < 500.',
      isPendingTest: false
    },
    {
      id: 'dht11',
      name: 'DHT11 Climate Module',
      pin: `GPIO${HARDWARE_PINS.DHT11_DATA} (Single-Bus)`,
      rawADC: null,
      maxADC: null,
      readings: { temp: '24.8 °C', humidity: '62 %' },
      type: 'Digital Single-Bus',
      status: 'Nominal Climate',
      statusColor: 'text-cyan-400',
      description: 'Digital temperature and relative humidity sensor with internal NTC thermistor and capacitive humidity element.',
      calibrationNote: 'Factory calibrated digital output. Range: 0-50°C (±2°C), 20-90% RH (±5%).',
      isPendingTest: false
    },
    {
      id: 'ldr',
      name: 'Light Dependent Resistor (LDR)',
      pin: `GPIO${HARDWARE_PINS.LDR_LIGHT_ADC} (ADC1_CH4)`,
      rawADC: 1420,
      maxADC: 4095,
      type: 'Analog ADC',
      status: 'Daylight Ambient',
      statusColor: 'text-amber-400',
      description: 'Photoresistor voltage divider indicating ambient solar illumination on the farm canopy.',
      calibrationNote: 'Darkness: ~3500-4095. Direct Sunlight: ~200-800. In-between: Day ambient.',
      isPendingTest: false
    },
    {
      id: 'pir',
      name: 'Passive Infrared (PIR) Motion Detector',
      pin: `GPIO${HARDWARE_PINS.PIR_MOTION} (Digital Input)`,
      rawADC: null,
      maxADC: null,
      digitalState: 'LOW (No Motion)',
      type: 'Digital GPIO',
      status: 'Pending Field Test',
      statusColor: 'text-amber-400',
      description: 'Pyroelectric infrared sensor detecting field motion, unauthorized access, or animal intrusion.',
      calibrationNote: 'Fixed pin assigned to GPIO26. Wiring and sensitivity potentiometer adjustment pending physical hardware bench test.',
      isPendingTest: true
    }
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Activity className="h-6 w-6 text-emerald-400" />
              Sensor Telemetry & Hardware Status
            </h1>
            <p className="text-sm text-slate-400">
              Real-time analog-to-digital conversions and digital bus readings from ESP32 DevKit V1.
            </p>
          </div>
          {isDemo && (
            <span className="self-start rounded-full bg-amber-500/10 border border-amber-500/30 px-3 py-1 text-xs font-mono text-amber-300">
              DEMO CALIBRATION VIEW
            </span>
          )}
        </div>

        {/* Warning Banner regarding raw ADC vs percentages */}
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-4 text-xs text-blue-200">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 shrink-0 text-blue-400 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-300 text-sm">Engineering Guideline: Raw ADC vs Conversion</p>
              <p className="mt-1 text-slate-300 leading-relaxed">
                As specified in the system brief, the initial hardware readings are raw ADC values (0–4095 on ESP32 12-bit ADC1), <strong>not fabricated moisture percentages</strong>. In-soil calibration across dry soil vs wet field capacity is required before automated thresholds are engaged.
              </p>
            </div>
          </div>
        </div>

        {/* Sensor Detail Cards */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {sensors.map((sensor) => (
            <div 
              key={sensor.id}
              className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-sm backdrop-blur space-y-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-semibold text-white">{sensor.name}</h3>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="rounded bg-slate-800 px-2 py-0.5 text-xs font-mono text-emerald-400 font-medium">
                      {sensor.pin}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      Type: {sensor.type}
                    </span>
                  </div>
                </div>

                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                  sensor.isPendingTest 
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' 
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                }`}>
                  {sensor.status}
                </span>
              </div>

              {/* Value display */}
              <div className="rounded-lg bg-slate-950/70 p-4 border border-slate-800/80">
                <span className="text-xs text-slate-500 block uppercase font-medium">Current Telemetry</span>
                {sensor.rawADC !== null ? (
                  <div className="mt-1 flex items-baseline justify-between">
                    <div>
                      <span className="text-3xl font-extrabold text-white font-mono">{sensor.rawADC}</span>
                      <span className="ml-2 text-xs text-slate-500 font-mono">/ {sensor.maxADC} ADC</span>
                    </div>
                    <span className="text-xs font-mono text-slate-400">
                      Approx {Math.round((sensor.rawADC / (sensor.maxADC || 4095)) * 100)}% of ADC Range
                    </span>
                  </div>
                ) : sensor.readings ? (
                  <div className="mt-2 grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs text-slate-400">Air Temperature</span>
                      <p className="text-2xl font-bold font-mono text-white">{sensor.readings.temp}</p>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400">Relative Humidity</span>
                      <p className="text-2xl font-bold font-mono text-cyan-400">{sensor.readings.humidity}</p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-xl font-bold font-mono text-amber-400">{sensor.digitalState}</span>
                    <span className="text-xs text-slate-500 font-mono">Digital Pin 26</span>
                  </div>
                )}
              </div>

              {/* Sensor Description & Field Calibration Notice */}
              <div className="space-y-2 text-xs">
                <p className="text-slate-300">{sensor.description}</p>
                <div className="rounded-md bg-slate-950/40 p-2.5 border border-slate-800 text-slate-400">
                  <strong className="text-slate-300">Calibration Benchmark:</strong> {sensor.calibrationNote}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
