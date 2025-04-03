@echo off
ECHO Rebuilding backend container...

REM Arrêt du conteneur backend
docker-compose stop backend

REM Reconstruction de l'image backend
docker-compose build --no-cache backend

REM Redémarrage des conteneurs
docker-compose up -d backend

ECHO.
ECHO Backend rebuilt and restarted!
ECHO You can access the API at:
FOR /F "tokens=2 delims==" %%a IN ('findstr "BACKEND_PORT" .env.docker') DO ECHO   - Backend API: http://localhost:%%a
ECHO. 