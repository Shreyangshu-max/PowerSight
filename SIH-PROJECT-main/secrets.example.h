#ifndef SECRETS_EXAMPLE_H
#define SECRETS_EXAMPLE_H

// PowerSight ESP32 Hardware Credentials Template
// Copy this file to 'secrets.h' and fill in your local Wi-Fi and server IP details.
const char* WIFI_SSID         = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD     = "YOUR_WIFI_PASSWORD";
const char* SERVER_URL        = "http://YOUR_SERVER_IP:5000/api/sensor-logs";
const char* COMMAND_POLL_URL  = "http://YOUR_SERVER_IP:5000/api/device-command?device_id=ESP32-MCH-007";
const char* DEVICE_ID         = "ESP32-MCH-007";

#endif // SECRETS_EXAMPLE_H
