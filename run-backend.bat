@echo off
title LearnLens AI Backend
cd /d "%~dp0learnlens-AI\backend"
echo ========================================================
echo   Starting LearnLens AI FastAPI Backend on Port 8000
echo ========================================================
python -m uvicorn main:app --reload --port 8000 --host 0.0.0.0
pause
