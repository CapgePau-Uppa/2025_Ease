@echo off
ECHO Rebuilding all containers...

REM Arrêt des conteneurs sauf couchbase pour préserver la configuration
docker-compose stop frontend backend nginx-proxy

REM Reconstruction des images
docker-compose build --no-cache frontend backend

REM Redémarrage des conteneurs
docker-compose up -d

ECHO.
ECHO All containers rebuilt and restarted!
ECHO You can access:
FOR /F "tokens=2 delims==" %%a IN ('findstr "FRONTEND_PORT" .env.docker') DO ECHO   - Frontend: http://localhost:%%a
ECHO   - Interface via nginx-proxy: http://localhost:8081
FOR /F "tokens=2 delims==" %%a IN ('findstr "BACKEND_PORT" .env.docker') DO ECHO   - Backend API: http://localhost:%%a
FOR /F "tokens=2 delims==" %%a IN ('findstr "DB_PORT" .env.docker') DO ECHO   - Couchbase: http://localhost:%%a
ECHO. 