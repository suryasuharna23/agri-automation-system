#pragma once
#include <Arduino.h>
#include "../config.h"

class PHSensor {
public:
    void begin() { pinMode(PIN_PH_SENSOR, INPUT); }

    // Returns pH value (0-14)
    float read() {
        // Average multiple readings for stability
        float sum = 0;
        for (int i = 0; i < 10; i++) {
            sum += analogRead(PIN_PH_SENSOR);
            delay(10);
        }
        float raw = sum / 10.0f;
        float voltage = raw * (3.3f / 4095.0f);
        // Calibration: pH = 7 at 2.5V, slope ~0.18V/pH
        float ph = 7.0f + (2.5f - voltage) / 0.18f;
        return constrain(ph, 0.0f, 14.0f);
    }
};
