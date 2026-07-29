#!/usr/bin/env sh
set -eu

cat > tedbirge-gateway <<'AGENT'
#!/usr/bin/env sh
set -eu

VERSION="0.7.0-live-agent"
DEFAULT_ENDPOINT="https://tedbirge-gateway.lovable.app/api/public/telemetry"

if [ -f /etc/tedbirge/node.env ]; then
  . /etc/tedbirge/node.env
fi

if [ "${1:-}" = "--version" ]; then
  echo "tedbirge-gateway $VERSION"
  exit 0
fi

NODE_ID="${TEDBIRGE_NODE_ID:-${TEDBIRGE_MESH_NODE_ID:-ev-01}}"
REGION="${TEDBIRGE_REGION:-TR}"
CARRIER="${TEDBIRGE_CARRIER:-auto}"
ENDPOINT="${TEDBIRGE_TELEMETRY_URL:-$DEFAULT_ENDPOINT}"
INTERVAL_RAW="${TEDBIRGE_TELEMETRY_INTERVAL:-60s}"
LICENSE_KEY="${TEDBIRGE_LICENSE_KEY:-}"

interval_seconds() {
  case "$INTERVAL_RAW" in
    *s) printf '%s' "${INTERVAL_RAW%s}" ;;
    *m) printf '%s' "$(( ${INTERVAL_RAW%m} * 60 ))" ;;
    *) printf '%s' "$INTERVAL_RAW" ;;
  esac
}

default_iface() {
  if command -v ip >/dev/null 2>&1; then
    ip route get 1.1.1.1 2>/dev/null | awk '{for(i=1;i<=NF;i++) if($i=="dev") {print $(i+1); exit}}'
    return
  fi
  if command -v route >/dev/null 2>&1; then
    route -n get default 2>/dev/null | awk '/interface:/{print $2; exit}'
    return
  fi
  printf ''
}

detect_carrier() {
  if [ "$CARRIER" != "auto" ]; then
    printf '%s' "$CARRIER"
    return
  fi
  IFACE="$(default_iface)"
  case "$IFACE" in
    wl*|wlan*|wifi*|en1) printf 'wifi' ;;
    ww*|wwan*|ppp*|usb*) printf 'cellular' ;;
    eth*|en*|em*|eno*) printf 'eth' ;;
    *)
      if command -v iw >/dev/null 2>&1 && iw dev 2>/dev/null | grep -q Interface; then
        printf 'wifi'
      else
        printf 'eth'
      fi
      ;;
  esac
}

carrier_ready() {
  C="$1"
  IFACE="$(default_iface)"
  case "$C" in
    eth|wifi|cellular) [ -n "$IFACE" ] ;;
    satellite) [ "${TEDBIRGE_SATELLITE_READY:-false}" = "true" ] ;;
    lora) [ "${TEDBIRGE_LORA_READY:-false}" = "true" ] || [ -e /dev/ttyUSB0 ] || [ -e /dev/ttyACM0 ] ;;
    halow) [ "${TEDBIRGE_HALOW_READY:-false}" = "true" ] || ls /sys/class/net 2>/dev/null | grep -qi 'ah\|halow' ;;
    tvws) [ "${TEDBIRGE_TVWS_READY:-false}" = "true" ] ;;
    wigig) [ "${TEDBIRGE_WIGIG_READY:-false}" = "true" ] || ls /sys/class/net 2>/dev/null | grep -qi 'wigig\|ad' ;;
    fso) [ "${TEDBIRGE_FSO_READY:-false}" = "true" ] ;;
    *) return 1 ;;
  esac
}

metric_rtt() {
  if command -v ping >/dev/null 2>&1; then
    ping -c 3 -q 1.1.1.1 2>/dev/null | awk -F'/' 'END{if($5=="") print 0; else print $5+0}'
  else
    printf '0'
  fi
}

metric_loss() {
  if command -v ping >/dev/null 2>&1; then
    ping -c 3 -q 1.1.1.1 2>/dev/null | awk -F', ' '/packet loss/{gsub(/%/,"",$3); print $3+0}'
  else
    printf '100'
  fi
}

send_once() {
  if [ -z "$LICENSE_KEY" ]; then
    echo "TEDBIRGE_LICENSE_KEY eksik. Paneldeki lisans anahtarını export edin." >&2
    return 2
  fi
  ACTIVE_CARRIER="$(detect_carrier)"
  RTT="$(metric_rtt)"
  LOSS="$(metric_loss)"
  ERROR_CODE=""
  NOTE="canli-dugum-ajani"
  if ! carrier_ready "$ACTIVE_CARRIER"; then
    ERROR_CODE="carrier_hardware_missing"
    NOTE="secili-tasiyici-icin-fiziksel-radio-adaptoru-bulunamadi"
  fi
  if [ "$RTT" = "0" ] && [ "$LOSS" = "100" ]; then
    ERROR_CODE="uplink_probe_failed"
    NOTE="wan-probu-basarisiz-mesh-kuyruk-modu-devrede"
  fi

  BODY="{\"node_id\":\"$NODE_ID\",\"region\":\"$REGION\",\"carrier\":\"$ACTIVE_CARRIER\",\"firmware\":\"$VERSION\",\"rtt_ms\":$RTT,\"packet_loss_pct\":$LOSS,\"note\":\"$NOTE\""
  if [ -n "$ERROR_CODE" ]; then
    BODY="$BODY,\"error_code\":\"$ERROR_CODE\""
  fi
  BODY="$BODY}"

  curl -fsS -X POST "$ENDPOINT" \
    -H "Content-Type: application/json" \
    -H "X-Tedbirge-License: $LICENSE_KEY" \
    -d "$BODY" >/dev/null
  echo "heartbeat gönderildi: node=$NODE_ID carrier=$ACTIVE_CARRIER rtt_ms=$RTT loss_pct=$LOSS"
}

case "${1:-run}" in
  oneshot|check) send_once ;;
  run|start|"")
    while :; do
      send_once || true
      sleep "$(interval_seconds)"
    done
    ;;
  *)
    echo "Kullanım: tedbirge-gateway [--version|oneshot|run]" >&2
    exit 2
    ;;
esac
AGENT

cat > tedbirge-cli <<'CLI'
#!/usr/bin/env sh
set -eu

case "${1:-help}" in
  carriers)
    echo "Tedbirge taşıyıcı kontrolü"
    echo "- eth/wifi/cellular: işletim sistemi ağ arayüzü üzerinden otomatik algılanır"
    echo "- lora/halow/tvws/wigig/fso/satellite: fiziksel radyo/adaptör veya TEDBIRGE_*_READY=true gerekir"
    if command -v ip >/dev/null 2>&1; then
      ip -brief link 2>/dev/null || true
    elif command -v ifconfig >/dev/null 2>&1; then
      ifconfig 2>/dev/null || true
    fi
    ;;
  mesh-demo)
    echo "Mesh doğrulaması gerçek düğümler heartbeat gönderdiğinde panelde canlı görünür."
    ;;
  *)
    echo "Kullanım: tedbirge-cli carriers|mesh-demo"
    ;;
esac
CLI

chmod +x tedbirge-gateway tedbirge-cli

echo "Tedbirge canlı düğüm ajanı hazır."
echo "1) export TEDBIRGE_LICENSE_KEY=<paneldeki_lisans>"
echo "2) export TEDBIRGE_NODE_ID=ev-01"
echo "3) ./tedbirge-gateway oneshot"
echo "4) Sürekli çalışma: ./tedbirge-gateway"