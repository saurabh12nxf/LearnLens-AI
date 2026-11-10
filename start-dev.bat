@echo off
title LearnLens AI Dev Starter
echo ========================================================
echo   Starting LearnLens AI Full Stack (Backend + Frontend)
echo ========================================================
start "LearnLens Backend (Port 8000)" cmd /k "cd /d %~dp0learnlens-AI\backend && python -m uvicorn main:app --reload --port 8000 --host 0.0.0.0"
start "LearnLens Frontend (Port 5173)" cmd /k "cd /d %~dp0learnlens-AI\frontend && npm run dev"
echo Both servers launched in separate windows!
