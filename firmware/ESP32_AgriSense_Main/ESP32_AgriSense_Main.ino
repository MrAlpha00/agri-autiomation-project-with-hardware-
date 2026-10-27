/*
 * AgriSense IoT - Main ESP32 DevKit V1 Hardware Firmware
 * Integrates:
 *  - 4 Analog/Digital Sensors:
 *      * Soil Moisture AO: GPIO34 (ADC1_CH6)
 *      * Water Level SIG : GPIO35 (ADC1_CH7)
 *      * Ambient LDR AO  : GPIO32 (ADC1_CH4)
 *      * Climate DHT11   : GPIO27
 *      * PIR Motion      : GPIO26
 *  - HW-316 4-Channel Active-Low Relay Module:
 *      * CH1 Pump   : GPIO18 (Active-Low)
 *      * CH2 LED    : GPIO19 (Active-Low)
 *      * CH3 Buzzer : GPIO21 (Active-Low)
 *      * CH4 Spare  : GPIO22 (Active-Low, locked safe OFF)
 *  - HTTPS Telemetry Burst every 15 seconds -> POST /api/telemetry
 *  - HTTPS Command Polling every 5 seconds  -> GET  /api/device/commands
 *  - Command Execution Acknowledgement      -> POST /api/device/ack
 *  - Built-in Safety Interlocks:
 *      * Safe OFF default on boot (Relay pins set HIGH before pinMode OUTPUT)
 *      * Low-water pump lockout (prevents pump burnout when waterRaw < 600)
 *      * Max pump continuous run watchdog
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include <DHT.h>

// ==============================================================================
// 1. CONFIGURATION: WI-FI & BACKEND CREDENTIALS
// ==============================================================================
// Replace with your local 2.4GHz Wi-Fi credentials
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// Hosted Vercel backend base URL (without trailing slash)
// Example: "https://your-app.vercel.app"
const char* BACKEND_BASE_URL = "https://your-app.vercel.app";

// Pre-shared secret token matching DEVICE_SHARED_SECRET in server environment
const char* DEVICE_SHARED_SECRET = "generate_a_secure_random_hex_key_here_for_esp32_auth";
const char* DEVICE_ID            = "ESP32-AGRI-01";
const char* FIRMWARE_VERSION     = "v1.0.0";

// ==============================================================================
// 2. PIN DEFINITIONS & HARDWARE MAP
// ==============================================================================
const int SOIL_PIN     = 34; // ADC1_CH6 (Input only)
const int WATER_PIN    = 35; // ADC1_CH7 (Input only)
const int LDR_PIN      = 32; // ADC1_CH4
const int DHT_PIN      = 27; // Single-bus digital
const int PIR_PIN      = 26; // Digital input

const int RELAY_PUMP   = 18; // HW-316 IN1
const int RELAY_LED    = 19; // HW-316 IN2
const int RELAY_BUZZER = 21; // HW-316 IN3
const int RELAY_SPARE  = 22; // HW-316 IN4 (Permanent SAFE OFF)

#define DHT_TYPE DHT11
DHT dht(DHT_PIN, DHT_TYPE);

// Active-Low logic constants
const int RELAY_ON  = LOW;
const int RELAY_OFF = HIGH;

// Safety thresholds
const int WATER_LOW_CUTOFF_RAW = 600; // Lockout pump if reservoir drops below this ADC
const unsigned long PUMP_MAX_RUN_MS = 120000; // 120s emergency runtime watchdog

// ==============================================================================
// 3. DEVICE RUNTIME STATE
// ==============================================================================
String currentMode = "MANUAL"; // "MANUAL" or "AUTO"

bool relayPumpState   = false;
bool relayLedState    = false;
bool relayBuzzerState = false;
bool relaySpareState  = false;

unsigned long pumpStartTime = 0;
unsigned long lastTelemetryMs = 0;
unsigned long lastCommandPollMs = 0;
const unsigned long TELEMETRY_INTERVAL_MS = 15000; // 15 seconds
const unsigned long COMMAND_POLL_INTERVAL_MS = 5000; // 5 seconds

// ==============================================================================
// 4. HELPER FUNCTIONS
// ==============================================================================
int readAdcAverage(int pin, int samples = 10) {
  long sum = 0;
  for (int i = 0; i < samples; i++) {
    sum += analogRead(pin);
    delay(5);
  }
  return (int)(sum / samples);
}

void applyRelayState(int pin, bool state) {
  digitalWrite(pin, state ? RELAY_ON : RELAY_OFF);
}

void emergencyAllOff() {
  relayPumpState = false;
  relayLedState = false;
  relayBuzzerState = false;
  relaySpareState = false;
  applyRelayState(RELAY_PUMP, false);
  applyRelayState(RELAY_LED, false);
  applyRelayState(RELAY_BUZZER, false);
  applyRelayState(RELAY_SPARE, false);
  Serial.println("[SAFETY] All relays forced to SAFE OFF state.");
}

// ==============================================================================
// 5. BACKEND API CLIENTS
// ==============================================================================
void sendTelemetry() {
  if (WiFi.status() != WL_CONNECTED) return;

  int soilRaw  = readAdcAverage(SOIL_PIN);
  int waterRaw = readAdcAverage(WATER_PIN);
  int lightRaw = readAdcAverage(LDR_PIN);
  bool pirMotion = digitalRead(PIR_PIN) == HIGH;

  float temp = dht.readTemperature();
  float hum  = dht.readHumidity();

  // Safety interlock check: if pump is running but water drops below cutoff, abort immediately!
  if (relayPumpState && waterRaw < WATER_LOW_CUTOFF_RAW) {
    applyRelayState(RELAY_PUMP, false);
    relayPumpState = false;
    Serial.println("[SAFETY INTERLOCK] Low water detected during pumping! Pump shut down.");
  }

  // Watchdog: max continuous pump runtime
  if (relayPumpState && (millis() - pumpStartTime > PUMP_MAX_RUN_MS)) {
    applyRelayState(RELAY_PUMP, false);
    relayPumpState = false;
    Serial.println("[SAFETY WATCHDOG] Pump reached 120s max runtime cutoff! Pump shut down.");
  }

  WiFiClientSecure client;
  client.setInsecure(); // Uses TLS without local CA validation for embedded simplicity

  HTTPClient http;
  String url = String(BACKEND_BASE_URL) + "/api/telemetry";
  http.begin(client, url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-device-secret", DEVICE_SHARED_SECRET);

  StaticJsonDocument<512> doc;
  doc["deviceId"] = DEVICE_ID;
  doc["firmwareVersion"] = FIRMWARE_VERSION;
  doc["uptimeMs"] = millis();
  doc["soilRaw"] = soilRaw;
  doc["waterRaw"] = waterRaw;
  doc["lightRaw"] = lightRaw;
  if (!isnan(temp)) doc["temperatureC"] = temp; else doc["temperatureC"] = nullptr;
  if (!isnan(hum))  doc["humidityPct"]  = hum;  else doc["humidityPct"]  = nullptr;
  doc["pirMotion"] = pirMotion;
  doc["mode"] = currentMode;

  JsonObject relays = doc.createNestedObject("relayStates");
  relays["pump"]   = relayPumpState;
  relays["light"]  = relayLedState;
  relays["buzzer"] = relayBuzzerState;
  relays["spare"]  = false;

  doc["wifiRssi"] = WiFi.RSSI();

  String requestBody;
  serializeJson(doc, requestBody);

  int httpCode = http.POST(requestBody);
  if (httpCode == 200) {
    Serial.printf("[TELEMETRY] Sent successfully: Soil=%d, Water=%d, Light=%d\n", soilRaw, waterRaw, lightRaw);
  } else {
    Serial.printf("[TELEMETRY] POST failed (HTTP %d)\n", httpCode);
  }

  http.end();
}

void acknowledgeCommand(String commandId, String status, String message) {
  if (WiFi.status() != WL_CONNECTED) return;

  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;
  String url = String(BACKEND_BASE_URL) + "/api/device/ack";
  http.begin(client, url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-device-secret", DEVICE_SHARED_SECRET);

  StaticJsonDocument<256> doc;
  doc["deviceId"]  = DEVICE_ID;
  doc["commandId"] = commandId;
  doc["status"]    = status;
  doc["message"]   = message;

  String requestBody;
  serializeJson(doc, requestBody);

  int httpCode = http.POST(requestBody);
  Serial.printf("[ACK] Command %s -> %s (HTTP %d)\n", commandId.c_str(), status.c_str(), httpCode);
  http.end();
}

void pollCommands() {
  if (WiFi.status() != WL_CONNECTED) return;

  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;
  String url = String(BACKEND_BASE_URL) + "/api/device/commands?deviceId=" + String(DEVICE_ID);
  http.begin(client, url);
  http.addHeader("x-device-secret", DEVICE_SHARED_SECRET);

  int httpCode = http.GET();
  if (httpCode == 200) {
    String payload = http.getString();
    DynamicJsonDocument doc(1024);
    DeserializationError error = deserializeJson(doc, payload);

    if (!error && doc.containsKey("commands")) {
      JsonArray commands = doc["commands"].as<JsonArray>();
      for (JsonObject cmd : commands) {
        String id      = cmd["id"].as<String>();
        String command = cmd["command"].as<String>();

        Serial.printf("[COMMAND RECEIVED] %s (ID: %s)\n", command.c_str(), id.c_str());

        // Execute command
        if (command == "PUMP_ON") {
          int currentWater = readAdcAverage(WATER_PIN);
          if (currentWater < WATER_LOW_CUTOFF_RAW) {
            acknowledgeCommand(id, "FAILED", "Low-water lockout: Reservoir ADC < 600");
          } else {
            relayPumpState = true;
            pumpStartTime = millis();
            applyRelayState(RELAY_PUMP, true);
            acknowledgeCommand(id, "SUCCEEDED", "Pump energized (CH1 ON)");
          }
        } else if (command == "PUMP_OFF") {
          relayPumpState = false;
          applyRelayState(RELAY_PUMP, false);
          acknowledgeCommand(id, "SUCCEEDED", "Pump de-energized (CH1 OFF)");
        } else if (command == "LIGHT_ON") {
          relayLedState = true;
          applyRelayState(RELAY_LED, true);
          acknowledgeCommand(id, "SUCCEEDED", "Grow Light energized (CH2 ON)");
        } else if (command == "LIGHT_OFF") {
          relayLedState = false;
          applyRelayState(RELAY_LED, false);
          acknowledgeCommand(id, "SUCCEEDED", "Grow Light de-energized (CH2 OFF)");
        } else if (command == "BUZZER_ON") {
          relayBuzzerState = true;
          applyRelayState(RELAY_BUZZER, true);
          acknowledgeCommand(id, "SUCCEEDED", "Alarm Buzzer active (CH3 ON)");
        } else if (command == "BUZZER_OFF") {
          relayBuzzerState = false;
          applyRelayState(RELAY_BUZZER, false);
          acknowledgeCommand(id, "SUCCEEDED", "Alarm Buzzer silent (CH3 OFF)");
        } else if (command == "ALL_OFF") {
          emergencyAllOff();
          acknowledgeCommand(id, "SUCCEEDED", "All actuators forced OFF");
        } else if (command == "SET_MODE_AUTO") {
          currentMode = "AUTO";
          acknowledgeCommand(id, "SUCCEEDED", "Switched to AUTOMATIC mode");
        } else if (command == "SET_MODE_MANUAL") {
          currentMode = "MANUAL";
          acknowledgeCommand(id, "SUCCEEDED", "Switched to MANUAL override mode");
        } else {
          acknowledgeCommand(id, "FAILED", "Unsupported command");
        }
      }
    }
  }

  http.end();
}

// ==============================================================================
// 6. SETUP & MAIN LOOP
// ==============================================================================
void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n==========================================");
  Serial.println("  AgriSense IoT - ESP32 Firmware Starting");
  Serial.println("==========================================");

  // CRITICAL: Initialize Active-Low relays to HIGH (OFF) before configuring pinMode
  // This prevents brief actuator pulsing upon boot
  digitalWrite(RELAY_PUMP, RELAY_OFF);
  digitalWrite(RELAY_LED, RELAY_OFF);
  digitalWrite(RELAY_BUZZER, RELAY_OFF);
  digitalWrite(RELAY_SPARE, RELAY_OFF);

  pinMode(RELAY_PUMP, OUTPUT);
  pinMode(RELAY_LED, OUTPUT);
  pinMode(RELAY_BUZZER, OUTPUT);
  pinMode(RELAY_SPARE, OUTPUT);

  // Set initial safe states
  digitalWrite(RELAY_PUMP, RELAY_OFF);
  digitalWrite(RELAY_LED, RELAY_OFF);
  digitalWrite(RELAY_BUZZER, RELAY_OFF);
  digitalWrite(RELAY_SPARE, RELAY_OFF);

  // Inputs
  pinMode(PIR_PIN, INPUT);
  analogReadResolution(12); // 12-bit ADC (0 - 4095)

  dht.begin();

  // Connect Wi-Fi
  Serial.printf("Connecting to Wi-Fi: %s ...\n", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\nWi-Fi Connected! IP Address: %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("\nWi-Fi connection timed out. Will retry in loop.");
  }
}

void loop() {
  // Maintain Wi-Fi
  if (WiFi.status() != WL_CONNECTED) {
    static unsigned long lastWifiRetry = 0;
    if (millis() - lastWifiRetry > 10000) {
      lastWifiRetry = millis();
      WiFi.reconnect();
    }
  }

  unsigned long currentMs = millis();

  // 1. Send Telemetry burst every 15s
  if (currentMs - lastTelemetryMs >= TELEMETRY_INTERVAL_MS) {
    lastTelemetryMs = currentMs;
    sendTelemetry();
  }

  // 2. Poll for pending website commands every 5s
  if (currentMs - lastCommandPollMs >= COMMAND_POLL_INTERVAL_MS) {
    lastCommandPollMs = currentMs;
    pollCommands();
  }

  delay(50);
}
