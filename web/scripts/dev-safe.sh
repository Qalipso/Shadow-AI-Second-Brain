#!/usr/bin/env bash
# Safe dev launcher for Shadow web.
# - Caps Node heap (--max-old-space-size=2048)
# - Pre-flight: node version, free RAM, port availability
# - Traps OOM/crash, logs cause, restarts up to MAX_RESTARTS

set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT" || exit 1

PORT="${PORT:-3007}"
MAX_RESTARTS="${MAX_RESTARTS:-3}"
MIN_FREE_MB="${MIN_FREE_MB:-512}"
LOG_DIR="$ROOT/.dev-logs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/dev-$(date +%Y%m%d-%H%M%S).log"

log() { printf '[dev-safe %s] %s\n' "$(date +%H:%M:%S)" "$*" | tee -a "$LOG_FILE"; }

# Pre-flight: Node >=20.
NODE_MAJOR=$(node -v 2>/dev/null | sed 's/^v//' | cut -d. -f1)
if [ -z "$NODE_MAJOR" ] || [ "$NODE_MAJOR" -lt 20 ]; then
  log "FATAL: Node 20+ required, found: $(node -v 2>/dev/null || echo none)"
  exit 1
fi

# Pre-flight: free RAM.
if command -v free >/dev/null 2>&1; then
  FREE_MB=$(free -m | awk '/^Mem:/ {print $7}')
  if [ "${FREE_MB:-0}" -lt "$MIN_FREE_MB" ]; then
    log "WARN: only ${FREE_MB}MB available (min ${MIN_FREE_MB}MB). Risk of OOM."
  fi
fi

# Pre-flight: port free.
if command -v lsof >/dev/null 2>&1; then
  if lsof -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
    log "WARN: port $PORT already in use. Attempting anyway."
  fi
fi

# Heap cap + diagnostic flags.
export NODE_OPTIONS="${NODE_OPTIONS:-} --max-old-space-size=2048 --max-semi-space-size=64 --heapsnapshot-near-heap-limit=1"

PID=""
cleanup() {
  log "Signal received, killing child PID=$PID"
  [ -n "$PID" ] && kill -TERM "$PID" 2>/dev/null
  wait "$PID" 2>/dev/null
  exit 0
}
trap cleanup INT TERM

restarts=0
while [ "$restarts" -le "$MAX_RESTARTS" ]; do
  log "Starting next dev on port $PORT (attempt $((restarts + 1))/$((MAX_RESTARTS + 1)))"

  npx next dev --port "$PORT" 2>&1 | tee -a "$LOG_FILE" &
  PID=$!
  wait "$PID"
  EXIT=$?

  case "$EXIT" in
    0|130)
      log "Dev server stopped cleanly (exit=$EXIT)."
      exit 0
      ;;
    134|137|139)
      log "CRASH: signal-class exit=$EXIT (OOM/segfault). Restarting."
      ;;
    *)
      log "CRASH: exit=$EXIT. Tail of log:"
      tail -n 20 "$LOG_FILE" || true
      ;;
  esac

  restarts=$((restarts + 1))
  if [ "$restarts" -gt "$MAX_RESTARTS" ]; then
    log "Max restarts reached. Aborting."
    exit 1
  fi
  sleep 2
done
