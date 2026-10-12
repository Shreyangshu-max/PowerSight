/**
 * ============================================================================
 * PowerSight ESP32 Smart Energy Monitor & Motor Fan Controller Firmware
 * ============================================================================
 * Target Hardware: ESP32 Dev Module (WROOM-32 / NodeMCU ESP32)
 * Sensor:          INA219 I2C Bi-directional Current/Power Monitor
 * Actuator:        5V DC Motor Fan (Controlled via GPIO 18 & MOSFET/Transistor/Relay)
 * Framework:       Arduino C++
 * 
 * ----------------------------------------------------------------------------
 * 🔌 HARDWARE WIRING DIAGRAM:
 * ----------------------------------------------------------------------------
 * 1. INA219 Sensor (I2C):
 *    - INA219 VCC  --> ESP32 3.3V (or 5V)
 *    - INA219 GND  --> ESP32 GND (Common Ground)
 *    - INA219 SDA  --> ESP32 GPIO 21
 *    - INA219 SCL  --> ESP32 GPIO 22
 *    - INA219 Vin+ --> 5V DC Power Source (+)
 *    - INA219 Vin- --> 5V DC Motor Fan (+) Positive Lead
 * 
 * 2. 5V DC Motor Fan Drive (Transistor / MOSFET N-Channel / Relay Module):
 *    - ESP32 GPIO 18 --> Gate of MOSFET (e.g. IRFZ44N / AO3400) or Base of Transistor (e.g. 2N2222 via 1k resistor)
 *    - Motor Fan (-)  --> Drain of MOSFET (or Collector of Transistor)
 *    - Source of MOSFET (or Emitter of Transistor) --> Common GND
 *    - Add Flyback Diode (1N4007) across Motor Fan leads (+) and (-) to absorb inductive spikes!
 * 
 * ============================================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <Adafruit_INA219.h>

// ----------------------------------------------------------------------------
// 1. Wi-Fi & Network Configuration (Loaded from private secrets.h)
// ----------------------------------------------------------------------------
#if __has_include("secrets.h")
  #include "secrets.h"
#else
  #include "secrets.example.h"
#endif

// ----------------------------------------------------------------------------
// 2. Hardware Pin Definitions
// ----------------------------------------------------------------------------
#define MOTOR_PIN  18  // GPIO 18 controls the 5V DC Motor Fan (HIGH = ON, LOW = OFF)
#define SDA_PIN    21  // I2C Data pin for INA219
#define SCL_PIN    22  // I2C Clock pin for INA219

// INA219 Sensor Object
Adafruit_INA219 ina219;
bool ina219Found = false;

// Motor state variable (ON or OFF)
String currentMotorState = "OFF";

// Timing Interval Configuration
const unsigned long TELEMETRY_INTERVAL_MS = 2000; // Transmit telemetry every 2 seconds
const unsigned long COMMAND_POLL_INTERVAL_MS = 1000; // Fast poll website control command every 1 second

unsigned long lastTelemetryTime = 0;
unsigned long lastCommandPollTime = 0;

// ----------------------------------------------------------------------------
// Function: Connect to Wi-Fi
// ----------------------------------------------------------------------------
void connectToWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;

  Serial.println();
  Serial.print("[WiFi] Connecting to SSID: ");
  Serial.println(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int retryCount = 0;
  while (WiFi.status() != WL_CONNECTED && retryCount < 20) {
    delay(500);
    Serial.print(".");
    retryCount++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.println("==================================================");
    Serial.println("🟢 [WiFi] Connected Successfully!");
    Serial.print("📡 ESP32 IP Address: ");
    Serial.println(WiFi.localIP());
    Serial.print("📶 RSSI Signal: ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
    Serial.println("==================================================");
  } else {
    Serial.println("\n⚠️ [WiFi] Connection failed! Retrying in background loop...");
  }
}

// ----------------------------------------------------------------------------
// Function: Apply Motor State to Hardware GPIO
// ----------------------------------------------------------------------------
void setMotorPower(String command) {
  command.toUpperCase();
  if (command == "ON") {
    if (currentMotorState != "ON") {
      currentMotorState = "ON";
      digitalWrite(MOTOR_PIN, HIGH);
      Serial.println("⚡ [MOTOR ACTUATOR] >>> FAN TURNED ON (GPIO 18 -> HIGH) <<<");
    }
  } else {
    if (currentMotorState != "OFF") {
      currentMotorState = "OFF";
      digitalWrite(MOTOR_PIN, LOW);
      Serial.println("⏸️ [MOTOR ACTUATOR] >>> FAN TURNED OFF (GPIO 18 -> LOW) <<<");
    }
  }
}

// ----------------------------------------------------------------------------
// Function: Poll Remote Control Command from Website Backend
// ----------------------------------------------------------------------------
void pollDeviceCommand() {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  http.begin(COMMAND_POLL_URL);
  http.setTimeout(1500);

  int httpCode = http.GET();

  if (httpCode == 200) {
    String response = http.getString();
    // Parse command from JSON response without needing heavy external libraries
    if (response.indexOf("\"command\":\"ON\"") != -1 || response.indexOf("\"command\": \"ON\"") != -1) {
      setMotorPower("ON");
    } else if (response.indexOf("\"command\":\"OFF\"") != -1 || response.indexOf("\"command\": \"OFF\"") != -1) {
      setMotorPower("OFF");
    }
  }

  http.end();
}

// ----------------------------------------------------------------------------
// Function: Measure Telemetry from INA219 & Dispatch POST to Website Backend
// ----------------------------------------------------------------------------
void measureAndSendTelemetry() {
  if (WiFi.status() != WL_CONNECTED) {
    connectToWiFi();
    return;
  }

  float busVoltage_V = 0.0;
  float current_A    = 0.0;
  float power_kW     = 0.0;

  if (ina219Found) {
    // Read live electrical values from physical INA219 hardware
    float shuntVoltage_mV = ina219.getShuntVoltage_mV();
    busVoltage_V          = ina219.getBusVoltage_V() + (shuntVoltage_mV / 1000.0);
    float current_mA      = ina219.getCurrent_mA();
    float power_mW        = ina219.getPower_mW();

    // Prevent floating noise when motor is OFF
    if (currentMotorState == "OFF" && current_mA < 10.0) {
      current_mA = 0.0;
      power_mW   = 0.0;
    }

    current_A = current_mA / 1000.0f; // Convert mA to Amps
    power_kW  = power_mW / 1000000.0f; // Convert mW to kW for dashboard engine
  } else {
    // Fallback simulation if INA219 module is not connected
    if (currentMotorState == "ON") {
      busVoltage_V = 5.05f + ((float)(random(-10, 10)) / 100.0f); // ~5.05V DC
      current_A    = 0.45f + ((float)(random(-5, 15)) / 100.0f);   // ~0.45A motor load
      power_kW     = (busVoltage_V * current_A) / 1000.0f;
    } else {
      busVoltage_V = 5.0f;
      current_A    = 0.0f;
      power_kW     = 0.0f;
    }
  }

  // Construct JSON Payload: { "device_id": "...", "voltage": ..., "current": ..., "power": ... }
  char jsonPayload[256];
  snprintf(
    jsonPayload, 
    sizeof(jsonPayload),
    "{\"device_id\":\"%s\",\"voltage\":%.2f,\"current\":%.3f,\"power\":%.6f}",
    DEVICE_ID,
    busVoltage_V,
    current_A,
    power_kW
  );

  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(2000);

  int httpResponseCode = http.POST((uint8_t*)jsonPayload, strlen(jsonPayload));

  if (httpResponseCode > 0) {
    String response = http.getString();
    
    // Check if backend returned an updated command in the POST response
    if (response.indexOf("\"command\":\"ON\"") != -1) {
      setMotorPower("ON");
    } else if (response.indexOf("\"command\":\"OFF\"") != -1) {
      setMotorPower("OFF");
    }

    Serial.printf("📊 [TELEMETRY SENT] [%s] V: %.2fV | I: %.3fA | P: %.4fkW | Motor State: %s | HTTP Code: %d\n",
      DEVICE_ID, busVoltage_V, current_A, power_kW, currentMotorState.c_str(), httpResponseCode
    );
  } else {
    Serial.printf("⚠️ [HTTP POST ERROR] Code: %d (%s)\n", httpResponseCode, http.errorToString(httpResponseCode).c_str());
  }

  http.end();
}

// ----------------------------------------------------------------------------
// Setup Routine
// ----------------------------------------------------------------------------
void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n==================================================");
  Serial.println("  ⚡ PowerSight ESP32 Motor Fan Controller Node   ");
  Serial.println("==================================================");

  // 1. Initialize Motor Control Output Pin
  pinMode(MOTOR_PIN, OUTPUT);
  digitalWrite(MOTOR_PIN, LOW); // Start with Motor Fan OFF for safety
  Serial.println("🔧 [GPIO 18] Motor Control Pin initialized to LOW (OFF)");

  // 2. Initialize INA219 I2C Sensor
  Wire.begin(SDA_PIN, SCL_PIN);
  Serial.println("🔧 [I2C] Initialized Wire on SDA: GPIO 21, SCL: GPIO 22");

  if (ina219.begin()) {
    ina219Found = true;
    Serial.println("✅ [INA219] Sensor detected and calibrated successfully!");
  } else {
    ina219Found = false;
    Serial.println("⚠️ [INA219] Sensor not detected on I2C bus! (Using load simulation)");
  }

  // 3. Connect Wi-Fi
  connectToWiFi();
}

// ----------------------------------------------------------------------------
// Main Loop Routine
// ----------------------------------------------------------------------------
void loop() {
  unsigned long now = millis();

  // Watchdog Wi-Fi reconnect
  if (WiFi.status() != WL_CONNECTED) {
    connectToWiFi();
  }

  // 1. Fast poll for website control command (Every 1 second)
  if (now - lastCommandPollTime >= COMMAND_POLL_INTERVAL_MS) {
    lastCommandPollTime = now;
    pollDeviceCommand();
  }

  // 2. Transmit INA219 Telemetry (Every 2 seconds)
  if (now - lastTelemetryTime >= TELEMETRY_INTERVAL_MS) {
    lastTelemetryTime = now;
    measureAndSendTelemetry();
  }

  delay(20); // CPU yield delay for OS stability
}
