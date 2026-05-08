#pragma once
#include <DHT.h>
#include "../config.h"

class DHT22Sensor {
public:
    DHT22Sensor() : dht(PIN_DHT22, DHT_TYPE) {}

    void begin() { dht.begin(); }

    bool read(float &temperature, float &humidity) {
        float t = dht.readTemperature();
        float h = dht.readHumidity();
        if (isnan(t) || isnan(h)) return false;
        temperature = t;
        humidity = h;
        return true;
    }

private:
    DHT dht;
};
