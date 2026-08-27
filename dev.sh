#!/usr/bin/env bash
# OmniNovel Studio — Dev Launcher (macOS / Linux)
# Chạy Backend FastAPI + Frontend Vite song song trong 2 tiến trình nền.

set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

RED='\033[0;31m'
GRN='\033[0;32m'
CYN='\033[0;36m'
NC='\033[0m'

section() {
    echo ""
    echo -e "${CYN}=========================================${NC}"
    echo -e "${CYN}  $1${NC}"
    echo -e "${CYN}=========================================${NC}"
}

# ---------- Sanity check ----------
if [ ! -f "backend/main.py" ]; then
    echo -e "${RED}[!] Không tìm thấy backend/main.py. Hãy chạy script tại thư mục gốc dự án.${NC}"
    exit 1
fi
if [ ! -f "package.json" ]; then
    echo -e "${RED}[!] Không tìm thấy package.json. Hãy chạy script tại thư mục gốc dự án.${NC}"
    exit 1
fi

# ---------- Port check ----------
if lsof -i :8000 >/dev/null 2>&1; then
    echo -e "${RED}[!] Port 8000 đang bận.${NC}"
fi
if lsof -i :5173 >/dev/null 2>&1; then
    echo -e "${RED}[!] Port 5173 đang bận.${NC}"
fi

section "OmniNovel Studio — Dev Launcher"

# ---------- Backend ----------
section "[backend] Chuẩn bị Python venv & cài requirements"
cd "$ROOT/backend"
if [ ! -d "venv" ]; then
    echo -e "${CYN}[backend] Tạo virtualenv...${NC}"
    python3 -m venv venv
fi
# shellcheck disable=SC1091
source venv/bin/activate
python -m pip install --upgrade pip >/dev/null
python -m pip install -r requirements.txt

if [ -z "$JWT_SECRET" ]; then
    export JWT_SECRET="dev-secret-change-me"
fi

mkdir -p "$ROOT/.logs"
echo -e "${CYN}[backend] Khởi động Uvicorn tại http://localhost:8000 (log: .logs/backend.log)${NC}"
nohup python -m uvicorn main:app --reload --port 8000 > "$ROOT/.logs/backend.log" 2>&1 &
BACKEND_PID=$!
echo "$BACKEND_PID" > "$ROOT/.logs/backend.pid"

# ---------- Frontend ----------
section "[frontend] Chuởi npm install (nếu cần)"
cd "$ROOT"
if [ ! -d "node_modules" ]; then
    echo -e "${CYN}[frontend] Cài đặt dependencies...${NC}"
    npm install
fi

echo -e "${CYN}[frontend] Khởi động Vite tại http://localhost:5173 (log: .logs/frontend.log)${NC}"
nohup npm run dev > "$ROOT/.logs/frontend.log" 2>&1 &
FRONTEND_PID=$!
echo "$FRONTEND_PID" > "$ROOT/.logs/frontend.pid"

section "Đã khởi động"
echo -e "  ${GRN}Backend  → http://localhost:8000  (Swagger UI: /docs)${NC}"
echo -e "  ${GRN}Frontend → http://localhost:5173${NC}"
echo ""
echo "PID:  backend=$BACKEND_PID  frontend=$FRONTEND_PID"
echo "Log:  tail -f .logs/backend.log  .logs/frontend.log"
echo "Dừng: ./dev.sh stop  (hoặc stop.ps1 trên Windows)"
