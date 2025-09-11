#!/bin/bash

# Elastic Fin-Intel - Development Start Script
# This script starts both backend and frontend servers with logging
# Usage: ./start-dev.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create logs directory
mkdir -p logs

# Function to get the absolute path of the project's virtual environment
get_project_venv_path() {
    echo "$(pwd)/backend/venv"
}

# Function to check if we're in the correct virtual environment
is_correct_venv() {
    local project_venv_path=$(get_project_venv_path)
    if [ -n "$VIRTUAL_ENV" ] && [ "$VIRTUAL_ENV" = "$project_venv_path" ]; then
        return 0
    else
        return 1
    fi
}

# Function to activate the project's virtual environment
activate_project_venv() {
    local venv_path="backend/venv"
    
    if [ ! -d "$venv_path" ]; then
        echo -e "${YELLOW}Virtual environment not found at $venv_path${NC}"
        echo -e "${YELLOW}Creating virtual environment...${NC}"
        cd backend
        python3 -m venv venv
        cd ..
        echo -e "${GREEN}✅ Virtual environment created${NC}"
    fi
    
    # Detect OS for activation script
    if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" || "$OSTYPE" == "win32" ]]; then
        source "$venv_path/Scripts/activate"
    else
        source "$venv_path/bin/activate"
    fi
}

# Function to cleanup background processes
cleanup() {
    echo -e "\n${YELLOW}Stopping servers...${NC}"
    if [ -f logs/backend.pid ]; then
        PID=$(cat logs/backend.pid)
        if kill -0 $PID 2>/dev/null; then
            kill $PID
            echo -e "${GREEN}Backend server stopped${NC}"
        fi
        rm -f logs/backend.pid
    fi
    
    if [ -f logs/frontend.pid ]; then
        PID=$(cat logs/frontend.pid)
        if kill -0 $PID 2>/dev/null; then
            kill $PID
            echo -e "${GREEN}Frontend server stopped${NC}"
        fi
        rm -f logs/frontend.pid
    fi
    
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

echo -e "${BLUE}Elastic Fin-Intel - Development Environment${NC}"
echo -e "${BLUE}==========================================${NC}"
echo ""

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Error: python3 is not installed or not in PATH${NC}"
    exit 1
fi

# Check if Node.js is available
if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is not installed or not in PATH${NC}"
    exit 1
fi

# Virtual Environment Management
echo -e "${YELLOW}Managing Python virtual environment...${NC}"

if is_correct_venv; then
    echo -e "${GREEN}✅ Already in correct project virtual environment${NC}"
else
    if [ -n "$VIRTUAL_ENV" ]; then
        echo -e "${YELLOW}⚠️  Currently in different virtual environment: $VIRTUAL_ENV${NC}"
        echo "Deactivating current virtual environment..."
        deactivate 2>/dev/null || true
    fi
    
    echo "Activating project virtual environment..."
    activate_project_venv
    echo -e "${GREEN}✅ Project virtual environment activated${NC}"
fi

# Install/update backend dependencies if needed
echo -e "${YELLOW}Checking backend dependencies...${NC}"
cd backend
if [ ! -f requirements.txt ]; then
    echo -e "${RED}Error: requirements.txt not found in backend directory${NC}"
    exit 1
fi

# Check if we need to install dependencies
if ! python -c "import fastapi, uvicorn" 2>/dev/null; then
    echo -e "${YELLOW}Installing backend dependencies...${NC}"
    pip install -r requirements.txt
    echo -e "${GREEN}✅ Backend dependencies installed${NC}"
fi
cd ..

# Install frontend dependencies if needed
echo -e "${YELLOW}Checking frontend dependencies...${NC}"
cd frontend
if [ ! -d node_modules ]; then
    echo -e "${YELLOW}Installing frontend dependencies...${NC}"
    npm install
    echo -e "${GREEN}✅ Frontend dependencies installed${NC}"
fi
cd ..

echo ""

# Start Backend Server
echo -e "${YELLOW}Starting backend server...${NC}"
cd backend
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000 > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > ../logs/backend.pid
cd ..

# Wait a moment for backend to start
sleep 3

# Check if backend started successfully
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo -e "${RED}Failed to start backend server. Check logs/backend.log${NC}"
    tail -20 logs/backend.log
    exit 1
fi

echo -e "${GREEN}Backend server started (PID: $BACKEND_PID)${NC}"
echo -e "  URL: http://localhost:8000"
echo -e "  API Docs: http://localhost:8000/docs"
echo -e "  Logs: logs/backend.log"

# Start Frontend Server
echo -e "${YELLOW}Starting frontend server...${NC}"
cd frontend
npm start > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > ../logs/frontend.pid
cd ..

# Wait a moment for frontend to start
sleep 5

# Check if frontend started successfully
if ! kill -0 $FRONTEND_PID 2>/dev/null; then
    echo -e "${RED}Failed to start frontend server. Check logs/frontend.log${NC}"
    tail -20 logs/frontend.log
    cleanup
    exit 1
fi

echo -e "${GREEN}Frontend server started (PID: $FRONTEND_PID)${NC}"
echo -e "  URL: http://localhost:3000"
echo -e "  Logs: logs/frontend.log"

echo ""
echo -e "${GREEN}🚀 Both servers are running!${NC}"
echo -e "${BLUE}Press Ctrl+C to stop both servers${NC}"
echo ""
echo -e "Application URLs:"
echo -e "  ${GREEN}Frontend: http://localhost:3000${NC}"
echo -e "  ${GREEN}Backend API: http://localhost:8000${NC}"
echo -e "  ${GREEN}API Documentation: http://localhost:8000/docs${NC}"
echo ""
echo -e "Logs are being written to:"
echo -e "  Backend:  logs/backend.log"
echo -e "  Frontend: logs/frontend.log"
echo ""
echo -e "You can monitor logs in real-time with:"
echo -e "  ${YELLOW}tail -f logs/backend.log${NC}"
echo -e "  ${YELLOW}tail -f logs/frontend.log${NC}"

# Wait indefinitely (servers run in background)
wait