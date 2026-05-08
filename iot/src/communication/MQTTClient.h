#pragma once
#include <PubSubClient.h>
#include <WiFiClient.h>
#include "../config.h"

class AgriMQTTClient {
public:
    AgriMQTTClient() : client(wifiClient) {}

    void begin() {
        client.setServer(MQTT_BROKER, MQTT_PORT);
        client.setBufferSize(512);
    }

    bool connect() {
        if (client.connected()) return true;
        return client.connect(DEVICE_ID, MQTT_USERNAME, MQTT_PASSWORD);
    }

    bool publish(const char* topic, const char* payload) {
        if (!connect()) return false;
        return client.publish(topic, payload, true); // retained=true
    }

    void loop() { client.loop(); }

    bool isConnected() { return client.connected(); }

private:
    WiFiClient wifiClient;
    PubSubClient client;
};
