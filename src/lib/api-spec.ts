import { SITE_URL } from "@/lib/site";

/** Tedbirge Protokol saha/telemetri API'si — OpenAPI 3.1 tanımı. */
export const OPENAPI_SPEC = {
  openapi: "3.1.0",
  info: {
    title: "Tedbirge Protokol Saha API",
    version: "0.6a-turnkey",
    description:
      "Gerçek Tedbirge Protokol düğümlerinin saha telemetrisini (RTT, throughput, paket kaybı) bildirdiği uç noktalar. İçerik veya kullanıcı verisi taşınmaz; yalnızca ölçüm metrikleri kabul edilir.",
    contact: { name: "Mehmet DİNÇ (Tedbirge Protokol)", url: `${SITE_URL}/iletisim` },
    license: { name: "Ticari lisans", url: `${SITE_URL}/kosullar` },
  },
  servers: [{ url: SITE_URL, description: "Üretim" }],
  security: [{ LicenseKey: [] }],
  components: {
    securitySchemes: {
      LicenseKey: {
        type: "apiKey",
        in: "header",
        name: "X-Tedbirge-License",
        description: "Müşteri panelindeki lisans anahtarı.",
      },
    },
    schemas: {
      TelemetryRequest: {
        type: "object",
        required: ["node_id"],
        properties: {
          node_id: { type: "string", maxLength: 64, example: "saha-A" },
          label: { type: "string", maxLength: 120, example: "Sakarya / Adapazarı röle" },
          region: {
            type: "string",
            enum: ["TR", "EU", "US", "UK", "GCC", "APAC", "JP", "OTHER"],
            default: "TR",
          },
          carrier: {
            type: "string",
            example: "lora",
            description: "eth | wifi | cellular | satellite | wigig | fso | halow | tvws | lora",
          },
          firmware: { type: "string", example: "0.6.1" },
          rtt_ms: { type: "number", example: 42.5 },
          throughput_kbps: { type: "number", example: 1840 },
          packet_loss_pct: { type: "number", example: 0.4 },
          hops: { type: "integer", example: 2 },
          bytes: { type: "integer", example: 82910 },
          note: { type: "string", maxLength: 500 },
          error_code: { type: "string", maxLength: 40, description: "Düğümün son hata kodu." },
          kind: {
            type: "string",
            enum: ["node", "ir_camera"],
            description: "Cihaz türü: mesh düğümü veya kızılötesi (termal) kamera.",
          },
          thermal: {
            type: "object",
            description:
              "Kızılötesi kamera kare özeti: temp_max_c, temp_min_c, temp_avg_c, detections, alarm, alarm_reason, frame_hash. Görüntü taşınmaz.",
          },
        },
      },
      TelemetryResponse: {
        type: "object",
        properties: {
          ok: { type: "boolean" },
          device_id: { type: "string", format: "uuid" },
          recorded: { type: "boolean" },
          ir_recorded: { type: "boolean" },
          pending_queue: {
            type: "integer",
            description: "Bu lisansta teslim bekleyen store-and-forward mesajı sayısı.",
          },
          node_limit: { type: "integer" },
          region: { type: "string" },
        },
      },
      QueueRequest: {
        type: "object",
        required: ["action", "node_id"],
        description:
          "Store-and-forward kuyruğu. action=enqueue: kopma sırasında biriken mesajları yükler. action=fetch: hedef düğüm kuyruğu öncelik + sıra düzeninde çeker. action=ack: teslim onayı verir.",
        properties: {
          action: { type: "string", enum: ["enqueue", "fetch", "ack"] },
          node_id: { type: "string", maxLength: 64, example: "saha-01" },
          limit: { type: "integer", minimum: 1, maximum: 200, default: 50 },
          ids: { type: "array", items: { type: "string", format: "uuid" } },
          messages: {
            type: "array",
            maxItems: 200,
            items: {
              type: "object",
              properties: {
                target_node: { type: "string", maxLength: 64, example: "ev-01" },
                priority: { type: "integer", minimum: 1, maximum: 9, default: 5 },
                payload: { type: "object" },
                queued_at: { type: "string", format: "date-time" },
              },
            },
          },
        },
      },
      Error: { type: "object", properties: { error: { type: "string" } } },
    },
  },
  paths: {
    "/api/public/telemetry": {
      post: {
        summary: "Düğüm heartbeat + ölçüm bildirimi",
        description:
          "Düğümü lisansa kaydeder (ilk çağrıda) ve ölçüm alanlarından en az biri gönderilmişse bir telemetri örneği yazar. Metriksiz çağrı saf heartbeat sayılır.",
        operationId: "postTelemetry",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/TelemetryRequest" } } },
        },
        responses: {
          "200": {
            description: "Kaydedildi",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/TelemetryResponse" } },
            },
          },
          "400": { description: "Geçersiz gövde", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "401": { description: "Lisans yok/geçersiz", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "403": {
            description:
              "Lisans pasif/süresi dolmuş, cihaz iptal edilmiş veya düğüm limiti aşılmış (license_inactive | license_expired | device_revoked | node_limit_reached)",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
        },
      },
      options: { summary: "CORS ön kontrolü", responses: { "204": { description: "Yok" } } },
    },
    "/api/public/queue": {
      post: {
        summary: "Store-and-forward mesaj kuyruğu",
        description:
          "İnternet/mesh kopmasında düğümde biriken mesajlar kalıcı olarak saklanır; bağlantı geri geldiğinde öncelik ve sıra düzeninde teslim edilir. Teslim onayı (ack) gelene kadar mesaj kuyrukta kalır.",
        operationId: "postQueue",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/QueueRequest" } } },
        },
        responses: {
          "200": { description: "İşlendi" },
          "400": { description: "Geçersiz gövde", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "401": { description: "Lisans yok/geçersiz", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "429": { description: "Hız sınırı" },
        },
      },
      options: { summary: "CORS ön kontrolü", responses: { "204": { description: "Yok" } } },
    },
    "/api/public/openapi.json": {
      get: {
        summary: "Bu OpenAPI tanımı",
        operationId: "getOpenApi",
        security: [],
        responses: { "200": { description: "OpenAPI 3.1 belgesi" } },
      },
    },
  },
} as const;

export const CURL_EXAMPLE = `curl -X POST ${SITE_URL}/api/public/telemetry \\
  -H "Content-Type: application/json" \\
  -H "X-Tedbirge-License: $TEDBIRGE_LICENSE_KEY" \\
  -d '{
    "node_id": "saha-A",
    "label": "Sakarya / Adapazarı röle",
    "region": "TR",
    "carrier": "lora",
    "rtt_ms": 42.5,
    "throughput_kbps": 1840,
    "packet_loss_pct": 0.4,
    "hops": 2,
    "bytes": 82910
  }'`;

export const AGENT_SNIPPET = `curl -fsSL ${SITE_URL}/install.sh | sh
export TEDBIRGE_LICENSE_KEY=<LISANS_ANAHTARINIZ>
export TEDBIRGE_NODE_ID=ev-01
export TEDBIRGE_REGION=TR
export TEDBIRGE_CARRIER=auto
./tedbirge-gateway oneshot
./tedbirge-cli carriers
./tedbirge-gateway`;

export const PY_SNIPPET = `import os, requests

requests.post(
    "${SITE_URL}/api/public/telemetry",
    headers={"X-Tedbirge-License": os.environ["TEDBIRGE_LICENSE_KEY"]},
    json={
        "node_id": "saha-A",
        "region": "TR",
        "carrier": "lora",
        "rtt_ms": 42.5,
        "throughput_kbps": 1840,
        "packet_loss_pct": 0.4,
    },
    timeout=10,
).raise_for_status()`;
