#pragma once
#include <WiFi.h>
#include "../config.h"

class WiFiManager {
public:
    bool connect(unsigned long timeoutMs = 15000) {
        WiFi.mode(WIFI_STA);
        WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
        unsigned long start = millis();
        while (WiFi.status() != WL_CONNECTED) {
            if (millis() - start > timeoutMs) return false;
            delay(500);
        }
        return true;
    }

    bool isConnected() { return WiFi.status() == WL_CONNECTED; }

    void disconnect() { WiFi.disconnect(); }
};
