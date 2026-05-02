#!/bin/bash

echo "Starting Multimodal Phishing Detection System..."

# Start Backend
echo "Starting Backend..."
cd backend_new && npm run dev &
BACKEND_PID=$!

# Start User Frontend
echo "Starting User Frontend..."
cd ../Frontend/user-frontend && npm run dev &
USER_FRONTEND_PID=$!

# Start Admin Frontend
echo "Starting Admin Frontend..."
cd ../admin-frontend && npm run dev &
ADMIN_FRONTEND_PID=$!

# Start ML Service
echo "Starting ML Service..."
cd ../../fyp_multimodal_model
python app.py &
ML_PID=$!

echo "All services started!"
echo "Backend: http://localhost:5000"
echo "User Frontend: http://localhost:5173"
echo "Admin Frontend: http://localhost:5174"
echo "ML Service: http://localhost:8000"
echo ""
echo "Press Ctrl+C to stop all services."

# Wait for all background processes
wait
