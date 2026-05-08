#pragma once
#include <Arduino.h>
#include "../config.h"

class SoilMoistureSensor {
public:
    void begin() { pinMode(PIN_SOIL_MOISTURE, INPUT); }

    // Returns soil moisture percentage (0-100%)
    float read() {
        int raw = analogRead(PIN_SOIL_MOISTURE);
        // ESP32 ADC: 0-4095 (dry=4095, wet=0 for capacitive sensor)
        float pct = 100.0f - (raw / 4095.0f * 100.0f);
        return constrain(pct, 0.0f, 100.0f);
    }
};
