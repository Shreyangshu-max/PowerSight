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
const unsigned long COMMAND_POLL_INTERVAL_MS = 500; // Fast poll command every 0.5 second
const unsigned long WIFI_RECONNECT_INTERVAL_MS = 10000; // Retry Wi-Fi non-blocking every 10s

unsigned long lastTelemetryTime = 0;
unsigned long lastCommandPollTime = 0;
unsigned long lastWiFiReconnectTime = 0;

// ----------------------------------------------------------------------------
// Function: Connect to Wi-Fi (Non-blocking)
// ----------------------------------------------------------------------------
void connectToWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;
  
  unsigned long now = millis();
  if (now - lastWiFiReconnectTime < WIFI_RECONNECT_INTERVAL_MS && lastWiFiReconnectTime != 0) return;
  lastWiFiReconnectTime = now;

  Serial.println("[WiFi] Attempting connection to SSID: " + String(WIFI_SSID));
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
}

// ----------------------------------------------------------------------------
// Function: Apply Motor State to Hardware GPIO (Option A: PWM + HIGH signal)
// ----------------------------------------------------------------------------
void setMotorPower(String command) {
  command.toUpperCase();
  if (command == "SPIKE") {
    currentMotorState = "SPIKE";
    pinMode(MOTOR_PIN, OUTPUT);
    analogWrite(MOTOR_PIN, 255);
    digitalWrite(MOTOR_PIN, HIGH);
    Serial.println("🚨 [MOTOR ACTUATOR] >>> SPIKE FAULT TRIGGERED (+10A / +50W Spike Load) <<<");
  } else if (command == "ON") {
    if (currentMotorState != "ON") {
      currentMotorState = "ON";
      pinMode(MOTOR_PIN, OUTPUT);
      analogWrite(MOTOR_PIN, 255);   // Output 100% PWM duty cycle
      digitalWrite(MOTOR_PIN, HIGH); // Reinforce HIGH output for buck controllers
      Serial.println("⚡ [MOTOR ACTUATOR] >>> FAN TURNED ON (GPIO 18 -> PWM 255 / HIGH) <<<");
    }
  } else {
    if (currentMotorState != "OFF") {
      currentMotorState = "OFF";
      analogWrite(MOTOR_PIN, 0);     // Output 0% PWM duty cycle
      digitalWrite(MOTOR_PIN, LOW);  // Reinforce LOW output
      Serial.println("⏸️ [MOTOR ACTUATOR] >>> FAN TURNED OFF (GPIO 18 -> PWM 0 / LOW) <<<");
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
    if (response.indexOf("\"command\":\"SPIKE\"") != -1 || response.indexOf("\"command\": \"SPIKE\"") != -1) {
      setMotorPower("SPIKE");
    } else if (response.indexOf("\"command\":\"ON\"") != -1 || response.indexOf("\"command\": \"ON\"") != -1) {
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
  float busVoltage_V = 0.0;
  float current_A    = 0.0;
  float power_kW     = 0.0;

  if (ina219Found) {
    // Read live electrical values from physical INA219 hardware
    float shuntVoltage_mV = ina219.getShuntVoltage_mV();
    busVoltage_V          = ina219.getBusVoltage_V() + (shuntVoltage_mV / 1000.0);
    float current_mA      = ina219.getCurrent_mA();
    float power_mW        = ina219.getPower_mW();

    // Prevent negative/noise readings when motor is OFF or idle
    if (current_mA < 0.0f || (currentMotorState == "OFF" && current_mA < 10.0f)) {
      current_mA = 0.0f;
      power_mW   = 0.0f;
    }

    current_A = current_mA / 1000.0f; // Convert mA to Amps
    power_kW  = power_mW / 1000000.0f; // Convert mW to kW for dashboard engine
  } else {
    // Smart Simulation Fallback when physical INA219 is not detected on I2C
    float noiseV = ((float)random(-5, 6)) / 100.0f; // +-0.05V fluctuation
    float noiseI = ((float)random(-2, 3)) / 100.0f; // +-0.02A fluctuation

    if (currentMotorState == "SPIKE") {
      // Simulate +10A / +50W Spike Fault Load
      busVoltage_V = 5.00f + noiseV;
      current_A    = 10.52f + noiseI; // +10 Amps spike
      power_kW     = (busVoltage_V * current_A) / 1000.0f; // ~52.6 Watts spike
    } else if (currentMotorState == "ON") {
      // Simulate realistic active 5V DC Motor Fan load
      busVoltage_V = 5.00f + noiseV;
      current_A    = 0.52f + noiseI; // ~0.52 Amps under normal load
      power_kW     = (busVoltage_V * current_A) / 1000.0f; // ~2.6 Watts
    } else {
      // Motor OFF simulation state
      busVoltage_V = 5.00f;
      current_A    = 0.00f;
      power_kW     = 0.00f;
    }
  }

  // Construct JSON Payload
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

  // ALWAYS output telemetry to USB Serial every 1 second
  Serial.print("[DATA] ");
  Serial.println(jsonPayload);

  // If Wi-Fi is connected, also POST over HTTP to backend
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(SERVER_URL);
    http.addHeader("Content-Type", "application/json");
    http.setTimeout(1000);

    int httpResponseCode = http.POST((uint8_t*)jsonPayload, strlen(jsonPayload));
    if (httpResponseCode > 0) {
      String response = http.getString();
      if (response.indexOf("\"command\":\"ON\"") != -1) {
        setMotorPower("ON");
      } else if (response.indexOf("\"command\":\"OFF\"") != -1) {
        setMotorPower("OFF");
      }
    }
    http.end();
  }
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

  // 2. Initialize INA219 I2C Sensor & I2C Bus Scan
  Wire.begin(SDA_PIN, SCL_PIN);
  Serial.println("🔧 [I2C] Initialized Wire on SDA: GPIO 21, SCL: GPIO 22");

  // I2C Scanner to verify physical INA219 connection
  Serial.println("🔍 [I2C SCAN] Scanning I2C bus for INA219 (0x40)...");
  byte count = 0;
  for (byte address = 1; address < 127; address++) {
    Wire.beginTransmission(address);
    if (Wire.endTransmission() == 0) {
      Serial.printf("   📍 Found I2C Device at address: 0x%02X\n", address);
      count++;
    }
  }
  if (count == 0) {
    Serial.println("   ⚠️ No I2C devices found! Check INA219 VCC (3.3V), GND, SDA (21), SCL (22).");
  }

  if (ina219.begin()) {
    ina219Found = true;
    Serial.println("✅ [INA219] Sensor detected and calibrated successfully!");
  } else {
    ina219Found = false;
    Serial.println("⚠️ [INA219] Sensor not detected on I2C bus!");
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
