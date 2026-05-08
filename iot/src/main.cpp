#include <Arduino.h>
#include <ArduinoJson.h>

#include "config.h"
#include "sensors/DHT22Sensor.h"
#include "sensors/SoilMoistureSensor.h"
#include "sensors/PHSensor.h"
#include "communication/WiFiManager.h"
#include "communication/MQTTClient.h"
#include "storage/LocalStorage.h"

DHT22Sensor dht22;
SoilMoistureSensor soilSensor;
PHSensor phSensor;
WiFiManager wifiManager;
AgriMQTTClient mqttClient;
LocalStorage storage;

unsigned long lastReadTime = 0;

String buildPayload(float temp, float humidity, float soil, float ph) {
    JsonDocument doc;
    doc["device_id"]     = DEVICE_ID;
    doc["temperature"]   = round(temp * 10) / 10.0;
    doc["humidity"]      = round(humidity * 10) / 10.0;
    doc["soil_moisture"] = round(soil * 10) / 10.0;
    doc["ph"]            = round(ph * 100) / 100.0;
    String output;
    serializeJson(doc, output);
    return output;
}

void syncOfflineData() {
    if (!storage.hasOfflineData()) return;
    String offline = storage.flushReadings();
    // Each line is a JSON payload — publish one by one
    int start = 0;
    while (start < (int)offline.length()) {
        int end = offline.indexOf('\n', start);
        if (end < 0) end = offline.length();
        String line = offline.substring(start, end);
        line.trim();
        if (line.length() > 0) {
            mqttClient.publish(TOPIC_SENSOR, line.c_str());
        }
        start = end + 1;
    }
    Serial.println("[Storage] Offline data synced.");
}

void setup() {
    Serial.begin(115200);
    dht22.begin();
    soilSensor.begin();
    phSensor.begin();
    storage.begin();
    mqttClient.begin();
    Serial.println("[Agri Node] Started: " DEVICE_ID);
}

void loop() {
    unsigned long now = millis();
    if (now - lastReadTime < READ_INTERVAL_MS) {
        mqttClient.loop();
        delay(100);
        return;
    }
    lastReadTime = now;

    float temperature, humidity, soil, ph;
    bool dhtOk = dht22.read(temperature, humidity);
    soil = soilSensor.read();
    ph   = phSensor.read();

    if (!dhtOk) {
        Serial.println("[Sensor] DHT22 read failed, skipping.");
        return;
    }

    String payload = buildPayload(temperature, humidity, soil, ph);
    Serial.println("[Sensor] " + payload);

    bool wifiOk = wifiManager.isConnected() || wifiManager.connect();
    if (wifiOk && mqttClient.connect()) {
        syncOfflineData();
        mqttClient.publish(TOPIC_SENSOR, payload.c_str());
        Serial.println("[MQTT] Published.");
    } else {
        storage.saveReading(payload.c_str());
        Serial.println("[Storage] Saved offline.");
    }
}
