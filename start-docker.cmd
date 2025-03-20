@echo off
ECHO Lancement de Docker Compose avec le fichier .env.development...

IF NOT EXIST .env.development (
  ECHO Erreur: Le fichier .env.development n'a pas été trouvé.
  EXIT /B 1
)

REM Arrêt des conteneurs précédents si nécessaire
docker-compose down

REM Démarrage des nouveaux conteneurs
docker-compose --env-file .env.development up -d

REM Si erreur, essayer de reconstruire
IF %ERRORLEVEL% NEQ 0 (
  ECHO Une erreur s'est produite. Tentative de reconstruction forcée...
  docker-compose --env-file .env.development build --no-cache
  docker-compose --env-file .env.development up -d
)

ECHO.
ECHO Services demarres:
docker-compose ps

ECHO.
ECHO Vous pouvez acceder a:
FOR /F "tokens=2 delims==" %%a IN ('findstr "FRONTEND_PORT" .env.development') DO ECHO   - Frontend: http://localhost:%%a
FOR /F "tokens=2 delims==" %%a IN ('findstr "BACKEND_PORT" .env.development') DO ECHO   - Backend API: http://localhost:%%a/data
FOR /F "tokens=2 delims==" %%a IN ('findstr "DB_PORT" .env.development') DO ECHO   - Couchbase Admin: http://localhost:%%a
FOR /F "tokens=2 delims==" %%a IN ('findstr "DB_USER" .env.development') DO SET DB_USER=%%a
FOR /F "tokens=2 delims==" %%a IN ('findstr "DB_PASSWORD" .env.development') DO SET DB_PASSWORD=%%a
ECHO     Identifiants Couchbase: %DB_USER% / %DB_PASSWORD% 