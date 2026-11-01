@echo off
echo Starting Django backend...
cd /d "%~dp0backend"
call ..\venv\Scripts\activate
python manage.py runserver

