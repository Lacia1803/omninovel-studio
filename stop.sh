#!/usr/bin/env bash
# Dừng các tiến trình dev đã khởi động bởi dev.sh

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

stop_pid() {
    local name="$1"
    local pidfile="$ROOT/.logs/$name.pid"
    if [ -f "$pidfile" ]; then
        local pid
        pid="$(cat "$pidfile")"
        if kill -0 "$pid" 2>/dev/null; then
            echo "[$name] Dừng PID $pid..."
            kill "$pid" 2>/dev/null || true
            sleep 1
            kill -9 "$pid" 2>/dev/null || true
        fi
        rm -f "$pidfile"
    fi
    # Fallback: kill anything still bound to dev ports
    if command -v lsof >/dev/null 2>&1; then
        local port="$2"
        if [ -n "$port" ]; then
            local pids
            pids="$(lsof -ti tcp:"$port" 2>/dev/null || true)"
            if [ -n "$pids" ]; then
                echo "[$name] Dừng các tiến trình còn lại trên port $port: $pids"
                kill $pids 2>/dev/null || true
            fi
        fi
    fi
}

stop_pid "backend"  8000
stop_pid "frontend" 5173

echo "Đã dừng xong."
