/*
 * AgriSense IoT - ESP32-CAM Field Vision Unit
 * Model: RHYX M21-45 (GC2145 Sensor) on AI-Thinker Compatible Pinout
 * 
 * Functions:
 *  - High-efficiency raw RGB565 acquisition converted to JPEG in software
 *  - QQVGA (160x120) optimized for smooth stream bandwidth
 *  - Endpoints:
 *      * GET  http://CAMERA_IP/         (Web view dashboard)
 *      * GET  http://CAMERA_IP/capture  (JPEG snapshot)
 *      * GET  http://CAMERA_IP:81/stream (MJPEG live stream)
 * 
 * Remote Viewing Architecture Note:
 * Direct unencrypted HTTP connections from local LAN IP (e.g. 192.168.x.x)
 * are blocked by modern browsers on hosted HTTPS websites due to Mixed-Content security.
 * To embed into the hosted Vercel dashboard:
 *  1. Open directly in a local browser tab on the same Wi-Fi network, OR
 *  2. Configure a secure HTTPS reverse proxy/tunnel (Cloudflare Tunnel, Tailscale, or ngrok).
 */

#include <Arduino.h>
#include <WiFi.h>
#include "esp_camera.h"
#include "img_converters.h"
#include "esp_http_server.h"

// -------------------- EDIT THESE VALUES --------------------
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// -------------------- AI-THINKER CAMERA PIN MAP --------------------
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27
#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

static httpd_handle_t camera_httpd = nullptr;
static httpd_handle_t stream_httpd = nullptr;

static const char INDEX_HTML[] PROGMEM = R"HTML(
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>AgriSense IoT Camera</title>
<style>
body{font-family:system-ui,Arial,sans-serif;background:#090d16;color:#eef2f3;margin:0;padding:24px}
main{max-width:800px;margin:auto}h1{font-size:1.4rem;color:#10b981}p{color:#94a3b8}.panel{background:#111827;border:1px solid #1f2937;border-radius:12px;padding:16px;margin:16px 0}
img{display:block;width:100%;height:auto;background:#000;border-radius:8px;min-height:180px;object-fit:contain}
button{border:0;border-radius:8px;padding:10px 16px;margin:8px 8px 8px 0;background:#059669;color:white;font-weight:700;cursor:pointer}
a{color:#34d399}
</style></head>
<body><main>
<h1>AgriSense IoT — Field Camera Unit</h1>
<p>Local network MJPEG stream & snapshot capture server.</p>
<div class="panel">
  <h2>Live Stream</h2>
  <img id="live" alt="Live stream loading...">
</div>
<div class="panel">
  <h2>Snapshot</h2>
  <button onclick="capturePhoto()">Capture Immediate Photo</button>
  <img id="still" alt="Captured photo will appear here">
</div>
<script>
const host=location.hostname;
const streamUrl='http://'+host+':81/stream';
document.getElementById('live').src=streamUrl;
function capturePhoto(){
  const url='/capture?t='+Date.now();
  document.getElementById('still').src=url;
}
</script></main></body></html>
)HTML";

static esp_err_t indexHandler(httpd_req_t *req) {
  httpd_resp_set_type(req, "text/html; charset=utf-8");
  httpd_resp_set_hdr(req, "Cache-Control", "no-store");
  return httpd_resp_send(req, INDEX_HTML, HTTPD_RESP_USE_STRLEN);
}

static esp_err_t captureHandler(httpd_req_t *req) {
  camera_fb_t *fb = esp_camera_fb_get();
  if (!fb) {
    httpd_resp_send_err(req, HTTPD_500_INTERNAL_SERVER_ERROR, "Camera capture failed");
    return ESP_FAIL;
  }

  httpd_resp_set_type(req, "image/jpeg");
  httpd_resp_set_hdr(req, "Cache-Control", "no-store, no-cache, must-revalidate");
  httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");

  esp_err_t result = ESP_OK;
  if (fb->format == PIXFORMAT_JPEG) {
    result = httpd_resp_send(req, reinterpret_cast<const char *>(fb->buf), fb->len);
  } else {
    uint8_t *jpgBuffer = nullptr;
    size_t jpgLength = 0;
    bool converted = frame2jpg(fb, 75, &jpgBuffer, &jpgLength);
    if (!converted || jpgBuffer == nullptr || jpgLength == 0) {
      if (jpgBuffer) free(jpgBuffer);
      esp_camera_fb_return(fb);
      httpd_resp_send_err(req, HTTPD_500_INTERNAL_SERVER_ERROR, "JPEG conversion failed");
      return ESP_FAIL;
    }
    result = httpd_resp_send(req, reinterpret_cast<const char *>(jpgBuffer), jpgLength);
    free(jpgBuffer);
  }

  esp_camera_fb_return(fb);
  return result;
}

static esp_err_t streamHandler(httpd_req_t *req) {
  static const char *STREAM_CONTENT_TYPE = "multipart/x-mixed-replace;boundary=frame";
  static const char *STREAM_BOUNDARY = "\r\n--frame\r\n";
  static const char *STREAM_PART = "Content-Type: image/jpeg\r\nContent-Length: %u\r\n\r\n";

  esp_err_t result = httpd_resp_set_type(req, STREAM_CONTENT_TYPE);
  if (result != ESP_OK) return result;
  httpd_resp_set_hdr(req, "Cache-Control", "no-store, no-cache, must-revalidate");
  httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");

  char partHeader[64];
  while (true) {
    camera_fb_t *fb = esp_camera_fb_get();
    if (!fb) {
      result = ESP_FAIL;
      break;
    }

    uint8_t *jpgBuffer = nullptr;
    size_t jpgLength = 0;
    bool allocatedJpeg = false;

    if (fb->format == PIXFORMAT_JPEG) {
      jpgBuffer = fb->buf;
      jpgLength = fb->len;
    } else {
      if (!frame2jpg(fb, 70, &jpgBuffer, &jpgLength) || !jpgBuffer || jpgLength == 0) {
        if (jpgBuffer) free(jpgBuffer);
        esp_camera_fb_return(fb);
        result = ESP_FAIL;
        break;
      }
      allocatedJpeg = true;
    }

    result = httpd_resp_send_chunk(req, STREAM_BOUNDARY, strlen(STREAM_BOUNDARY));
    if (result == ESP_OK) {
      int headerLength = snprintf(partHeader, sizeof(partHeader), STREAM_PART, (unsigned int)jpgLength);
      if (headerLength > 0 && headerLength < (int)sizeof(partHeader)) {
        result = httpd_resp_send_chunk(req, partHeader, (size_t)headerLength);
      }
    }
    if (result == ESP_OK) {
      result = httpd_resp_send_chunk(req, reinterpret_cast<const char *>(jpgBuffer), jpgLength);
    }

    if (allocatedJpeg) free(jpgBuffer);
    esp_camera_fb_return(fb);
    if (result != ESP_OK) break;
    vTaskDelay(pdMS_TO_TICKS(60));
  }

  return result;
}

static void startCameraServers() {
  httpd_config_t config = HTTPD_DEFAULT_CONFIG();
  config.server_port = 80;
  config.max_uri_handlers = 8;

  httpd_uri_t indexUri = { "/", HTTP_GET, indexHandler, nullptr };
  httpd_uri_t captureUri = { "/capture", HTTP_GET, captureHandler, nullptr };

  if (httpd_start(&camera_httpd, &config) == ESP_OK) {
    httpd_register_uri_handler(camera_httpd, &indexUri);
    httpd_register_uri_handler(camera_httpd, &captureUri);
    Serial.println("[CAMERA] Web server started on port 80 (/ and /capture)");
  }

  httpd_config_t streamConfig = HTTPD_DEFAULT_CONFIG();
  streamConfig.server_port = 81;
  streamConfig.ctrl_port = 32769;
  streamConfig.max_uri_handlers = 4;
  streamConfig.stack_size = 8192;

  httpd_uri_t streamUri = { "/stream", HTTP_GET, streamHandler, nullptr };

  if (httpd_start(&stream_httpd, &streamConfig) == ESP_OK) {
    httpd_register_uri_handler(stream_httpd, &streamUri);
    Serial.println("[CAMERA] MJPEG Stream server started on port 81 (/stream)");
  }
}

static bool initializeCamera() {
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer   = LEDC_TIMER_0;
  config.pin_d0       = Y2_GPIO_NUM;
  config.pin_d1       = Y3_GPIO_NUM;
  config.pin_d2       = Y4_GPIO_NUM;
  config.pin_d3       = Y5_GPIO_NUM;
  config.pin_d4       = Y6_GPIO_NUM;
  config.pin_d5       = Y7_GPIO_NUM;
  config.pin_d6       = Y8_GPIO_NUM;
  config.pin_d7       = Y9_GPIO_NUM;
  config.pin_xclk     = XCLK_GPIO_NUM;
  config.pin_pclk     = PCLK_GPIO_NUM;
  config.pin_vsync    = VSYNC_GPIO_NUM;
  config.pin_href     = HREF_GPIO_NUM;
  config.pin_sccb_sda = SIOD_GPIO_NUM;
  config.pin_sccb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn     = PWDN_GPIO_NUM;
  config.pin_reset    = RESET_GPIO_NUM;
  config.xclk_freq_hz = 10000000;

  // GC2145 / RHYX M21-45: Raw RGB565 frame converted to JPEG in software
  config.pixel_format = PIXFORMAT_RGB565;
  config.frame_size   = FRAMESIZE_QQVGA; // 160x120
  config.jpeg_quality = 12;
  config.fb_count     = 1;
  config.grab_mode    = CAMERA_GRAB_WHEN_EMPTY;
  config.fb_location  = psramFound() ? CAMERA_FB_IN_PSRAM : CAMERA_FB_IN_DRAM;

  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("[CAMERA ERROR] esp_camera_init failed: 0x%x\n", err);
    return false;
  }

  sensor_t *sensor = esp_camera_sensor_get();
  if (sensor) {
    sensor->set_framesize(sensor, FRAMESIZE_QQVGA);
  }

  return true;
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\nAgriSense ESP32-CAM Starting...");

  if (!initializeCamera()) {
    Serial.println("[CAMERA FATAL] Camera initialization failed.");
    return;
  }

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.printf("\nWi-Fi Connected! IP: %s\n", WiFi.localIP().toString().c_str());
  startCameraServers();
}

void loop() {
  delay(10000);
}
