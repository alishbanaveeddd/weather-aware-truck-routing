@echo off
title Weather-Aware Truck Routing Launcher
echo ========================================================
echo   Weather-Aware Truck Routing - Starting System...
echo ========================================================
echo.

cd /d "%~dp0"

echo [1/3] Starting Django Backend on http://127.0.0.1:8000 ...
start "Truck Router - Backend (Django)" cmd /k "cd /d "%~dp0backend" && ..\venv\Scripts\python manage.py runserver 127.0.0.1:8000"

echo [2/3] Starting React Frontend on http://localhost:5173 ...
start "Truck Router - Frontend (Vite)" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo [3/3] Waiting for services to initialize...
timeout /t 3 /nobreak >nul

echo.
echo ========================================================
echo   Application started!
echo   Opening browser at http://localhost:5173 ...
echo ========================================================
start http://localhost:5173

exit
