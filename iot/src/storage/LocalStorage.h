#pragma once
#include <LittleFS.h>
#include <ArduinoJson.h>
#include "../config.h"

class LocalStorage {
public:
    bool begin() { return LittleFS.begin(true); }

    void saveReading(const char* jsonPayload) {
        File f = LittleFS.open(OFFLINE_FILE, "a");
        if (!f) return;
        f.println(jsonPayload);
        f.close();
    }

    // Returns all stored readings and clears the file
    String flushReadings() {
        if (!LittleFS.exists(OFFLINE_FILE)) return "";
        File f = LittleFS.open(OFFLINE_FILE, "r");
        if (!f) return "";
        String content = f.readString();
        f.close();
        LittleFS.remove(OFFLINE_FILE);
        return content;
    }

    bool hasOfflineData() { return LittleFS.exists(OFFLINE_FILE); }
};
