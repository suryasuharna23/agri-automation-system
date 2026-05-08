#pragma once

// WiFi
#define WIFI_SSID       "YOUR_WIFI_SSID"
#define WIFI_PASSWORD   "YOUR_WIFI_PASSWORD"

// MQTT Broker
#define MQTT_BROKER     "your-mqtt-broker.com"
#define MQTT_PORT       1883
#define MQTT_USERNAME   "agri_iot"
#define MQTT_PASSWORD   "iot_password"
#define DEVICE_ID       "ESP32_NODE_001"

// MQTT Topics
#define TOPIC_SENSOR    "agri/sensor/" DEVICE_ID
#define TOPIC_STATUS    "agri/status/" DEVICE_ID

// Pin Definitions
#define PIN_DHT22       4
#define PIN_SOIL_MOISTURE A0   // GPIO 34
#define PIN_PH_SENSOR   A3    // GPIO 35

// Sensor Config
#define DHT_TYPE        DHT22
#define READ_INTERVAL_MS 30000   // 30 seconds

// Anomaly Thresholds
#define TEMP_MIN        15.0f
#define TEMP_MAX        35.0f
#define HUMID_MIN       40.0f
#define HUMID_MAX       90.0f
#define SOIL_MIN        20.0f
#define SOIL_MAX        80.0f
#define PH_MIN          5.5f
#define PH_MAX          7.5f

// LittleFS offline buffer
#define MAX_OFFLINE_RECORDS 100
#define OFFLINE_FILE    "/offline_data.json"
