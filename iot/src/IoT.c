/**
 * ============================================================
 *  AgriTrust - IoT Sensor Node
 *  Hardware  : ESP32 (30-Pin)
 *  Author    : AgriTrust Team
 *  Version   : 1.0.0
 * ============================================================
 *  Library yang WAJIB diinstall di Arduino IDE:
 *    1. DHT sensor library  – by Adafruit  (v1.4.x)
 *       Dependensi otomatis: Adafruit Unified Sensor
 *    2. PubSubClient        – by Nick O'Leary (v2.8.x)
 *
 *  Cara install: Arduino IDE → Tools → Manage Libraries
 *               → cari nama library di atas → Install
 * ============================================================
 *
 *  Topik MQTT:
 *    Suhu Udara      → agritrust/lahan1/suhu
 *    Kelembapan Udara → agritrust/lahan1/kelembapan
 *    Kelembapan Tanah → agritrust/lahan1/tanah
 *    pH Tanah        → agritrust/lahan1/ph
 * ============================================================
 */

// ─── Library ────────────────────────────────────────────────
#include <WiFi.h>
#include <WiFiClientSecure.h> 
#include <PubSubClient.h>
#include <DHT.h>
#include <ArduinoJson.h>        
#include <LittleFS.h>          


// ─── Kredensial – GANTI sesuai kebutuhan ────────────────────
const char* WIFI_SSID        = "Rakdeeetzz";
const char* WIFI_PASSWORD    = "RadhityaN_394";
// ── MQTT Broker ─────────────────────────────────────────────
const char* MQTT_BROKER   = "5111026377ef49fc92b9f5661ad9a703.s1.eu.hivemq.cloud";
const int   MQTT_PORT     = 8883;                   // TLS
const char* MQTT_USER     = "Agri_Sensor";
const char* MQTT_PASSWORD = "inibuatIoTAgri8";      // [FIX-4] Jangan commit ke Git!

// ── Identitas Device ────────────────────────────────────────
// Ganti setiap node dengan ID unik, contoh: ESP32_NODE_001, ESP32_NODE_002
#define DEVICE_ID  "ESP32_NODE_001"

// ── Topik MQTT (otomatis dari DEVICE_ID) ────────────────────
#define TOPIC_SENSOR  "agri/sensor/" DEVICE_ID

// ── Pin Sensor ───────────────────────────────────────────────
#define DHTPIN        32    // GPIO 32 – DHT11 (Digital)
#define DHTTYPE       DHT11
#define SOIL_PIN      34    // GPIO 34 – Soil Moisture (Analog)
#define PH_PIN        35    // GPIO 35 – pH Meter Analog V1.1

// ── Interval & Offline Buffer ────────────────────────────────
const unsigned long SEND_INTERVAL_MS = 30000;   // 30 detik (sesuai repo)
#define OFFLINE_FILE  "/offline_data.json"       // [FIX-3]

// ── Kalibrasi Soil Moisture ──────────────────────────────────
// Cara kalibrasi:
//   1. Sensor di udara terbuka → Serial Monitor → catat angka → NILAI_KERING
//   2. Sensor tercelup air     → Serial Monitor → catat angka → NILAI_BASAH
#define SOIL_NILAI_KERING  3000   // <-- Ganti setelah kalibrasi lapangan
#define SOIL_NILAI_BASAH   1000   // <-- Ganti setelah kalibrasi lapangan

// ── Kalibrasi pH ─────────────────────────────────────────────
// Cara kalibrasi 2 titik (buffer pH 4.00 dan pH 7.00):
//   1. Celup ke buffer pH 7.00 → catat tegangan V7
//   2. Celup ke buffer pH 4.00 → catat tegangan V4
//   3. m = (7.0 - 4.0) / (V7 - V4)
//   4. b = 7.0 - m * V7
#define PH_SLOPE      -5.70f    // m  <-- Ganti setelah kalibrasi
#define PH_INTERCEPT  21.34f    // b  <-- Ganti setelah kalibrasi

// ════════════════════════════════════════════════════════════
//  Objek Global
// ════════════════════════════════════════════════════════════
DHT              dht(DHTPIN, DHTTYPE);
WiFiClientSecure wifiClient;                // [FIX-1]
PubSubClient     mqttClient(wifiClient);

unsigned long lastSendTime = 0;

// ════════════════════════════════════════════════════════════
//  FUNGSI: Koneksi Wi-Fi
// ════════════════════════════════════════════════════════════
void setup_wifi() {
  Serial.println();
  Serial.print("[WiFi] Menghubungkan ke: ");
  Serial.println(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED) {
    if (millis() - start > 15000) {
      Serial.println("\n[WiFi] Timeout! Lanjut tanpa WiFi...");
      return;
    }
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.println("[WiFi] Terhubung!");
  Serial.print("[WiFi] IP: ");
  Serial.println(WiFi.localIP());
}

bool isWifiConnected() {
  return WiFi.status() == WL_CONNECTED;
}

// ════════════════════════════════════════════════════════════
//  FUNGSI: Reconnect MQTT
// ════════════════════════════════════════════════════════════
bool reconnect_mqtt() {
  if (mqttClient.connected()) return true;

  Serial.print("[MQTT] Menghubungkan ke broker... ");

  // Client ID unik berbasis MAC address
  String clientId = "AgriTrust-";
  clientId += String(DEVICE_ID);
  clientId += "-";
  clientId += String(WiFi.macAddress());

  if (mqttClient.connect(clientId.c_str(), MQTT_USER, MQTT_PASSWORD)) {
    Serial.println("Terhubung!");
    return true;
  }

  Serial.print("Gagal, rc=");
  Serial.println(mqttClient.state());
  return false;
}

// ════════════════════════════════════════════════════════════
//  FUNGSI: Baca Sensor Kelembapan Tanah
//  Output : 0–100 (%)
// ════════════════════════════════════════════════════════════
float bacaSoilMoisture() {
  int raw = analogRead(SOIL_PIN);
  int persen = map(raw, SOIL_NILAI_KERING, SOIL_NILAI_BASAH, 0, 100);
  return (float)constrain(persen, 0, 100);
}

// ════════════════════════════════════════════════════════════
//  FUNGSI: Baca Sensor pH
//  Output : nilai pH float (0.0–14.0)
// ════════════════════════════════════════════════════════════
float bacaPH() {
  long total = 0;
  for (int i = 0; i < 10; i++) {
    total += analogRead(PH_PIN);
    delay(10);
  }
  float rataRataADC = total / 10.0f;
  float tegangan    = (rataRataADC / 4095.0f) * 3.3f;
  float nilaiPH     = PH_SLOPE * tegangan + PH_INTERCEPT;
  return constrain(nilaiPH, 0.0f, 14.0f);
}

// ════════════════════════════════════════════════════════════
//  [FIX-2] FUNGSI: Build JSON Payload
// ════════════════════════════════════════════════════════════
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

// ════════════════════════════════════════════════════════════
//  [FIX-3] FUNGSI: Offline Buffer (LittleFS)
// ════════════════════════════════════════════════════════════
void saveOffline(const String& payload) {
  File f = LittleFS.open(OFFLINE_FILE, "a");
  if (!f) {
    Serial.println("[Storage] Gagal buka file offline!");
    return;
  }
  f.println(payload);
  f.close();
  Serial.println("[Storage] Data disimpan offline.");
}

bool hasOfflineData() {
  return LittleFS.exists(OFFLINE_FILE);
}

// Flush semua data offline ke MQTT, lalu hapus file
void syncOfflineData() {
  if (!hasOfflineData()) return;

  File f = LittleFS.open(OFFLINE_FILE, "r");
  if (!f) return;

  Serial.println("[Storage] Menyinkronkan data offline...");
  int count = 0;
  while (f.available()) {
    String line = f.readStringUntil('\n');
    line.trim();
    if (line.length() == 0) continue;
    if (mqttClient.publish(TOPIC_SENSOR, line.c_str(), true)) {
      count++;
    }
  }
  f.close();
  LittleFS.remove(OFFLINE_FILE);
  Serial.print("[Storage] Sinkronisasi selesai. Data terkirim: ");
  Serial.println(count);
}

// ════════════════════════════════════════════════════════════
//  SETUP
// ════════════════════════════════════════════════════════════
void setup() {
  Serial.begin(115200);
  delay(100);

  Serial.println("=====================================");
  Serial.println("  AgriTrust - IoT Sensor Node v2.0  ");
  Serial.println("  Device ID : " DEVICE_ID);
  Serial.println("=====================================");

  // Init sensor DHT22
  dht.begin();

  // Init LittleFS untuk offline buffer [FIX-3]
  if (!LittleFS.begin(true)) {
    Serial.println("[Storage] LittleFS gagal mount!");
  } else {
    Serial.println("[Storage] LittleFS OK.");
  }

  // Sambungkan WiFi
  setup_wifi();

  // [FIX-1] Skip verifikasi sertifikat TLS (untuk development)
  // Untuk produksi: ganti dengan wifiClient.setCACert(ca_cert)
  wifiClient.setInsecure();

  // Konfigurasi MQTT
  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setKeepAlive(30);
  mqttClient.setBufferSize(512);

  Serial.println("[Setup] Inisialisasi selesai. Mulai membaca sensor...");
}

// ════════════════════════════════════════════════════════════
//  LOOP (Non-blocking dengan millis())
// ════════════════════════════════════════════════════════════
void loop() {
  // Jaga koneksi MQTT tetap aktif (proses keepalive & pesan masuk)
  if (isWifiConnected() && mqttClient.connected()) {
    mqttClient.loop();
  }

  // Kirim data setiap SEND_INTERVAL_MS (non-blocking)
  unsigned long now = millis();
  if (now - lastSendTime < SEND_INTERVAL_MS) {
    return;
  }
  lastSendTime = now;

  // ── Baca semua sensor ──────────────────────────────────────
  float suhu       = dht.readTemperature();
  float kelembapan = dht.readHumidity();

  // Validasi DHT22 (NaN = gagal baca)
  if (isnan(suhu) || isnan(kelembapan)) {
    Serial.println("[DHT22] Gagal membaca! Periksa koneksi kabel.");
    return;
  }

  float soil = bacaSoilMoisture();
  float ph   = bacaPH();

  // ── Tampilkan di Serial Monitor ───────────────────────────
  Serial.println("----- Pembacaan Sensor -----");
  Serial.print("Suhu        : "); Serial.print(suhu, 1);       Serial.println(" °C");
  Serial.print("Kelembapan  : "); Serial.print(kelembapan, 1); Serial.println(" %");
  Serial.print("Tanah       : "); Serial.print(soil, 1);       Serial.println(" %");
  Serial.print("pH          : "); Serial.println(ph, 2);
  Serial.println("----------------------------");

  // ── Build JSON payload [FIX-2] ────────────────────────────
  String payload = buildPayload(suhu, kelembapan, soil, ph);
  Serial.println("[Payload] " + payload);

  // ── Coba kirim via MQTT ───────────────────────────────────
  bool wifiOk = isWifiConnected() || (WiFi.reconnect(), delay(1000), isWifiConnected());
  bool mqttOk = wifiOk && reconnect_mqtt();

  if (mqttOk) {
    // Kirim data offline yang tersimpan dulu [FIX-3]
    syncOfflineData();

    // Publish data saat ini (retained=true agar broker simpan state terakhir)
    if (mqttClient.publish(TOPIC_SENSOR, payload.c_str(), true)) {
      Serial.println("[MQTT] Data berhasil dikirim ke broker.");
    } else {
      Serial.println("[MQTT] Publish gagal! Data disimpan offline.");
      saveOffline(payload);
    }
  } else {
    // Offline: simpan ke LittleFS [FIX-3]
    Serial.println("[MQTT] Tidak terhubung. Data disimpan offline.");
    saveOffline(payload);
  }
}
