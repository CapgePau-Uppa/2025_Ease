#!/bin/bash
set -e

echo "🔍 Contenu du répertoire /usr/share/nginx/html:"
ls -la /usr/share/nginx/html/

echo "🔄 Remplacer les variables d'environnement dans les fichiers JavaScript..."
find /usr/share/nginx/html -type f -name "*.js" -exec sed -i "s|http://localhost:3000|${URL_BACKEND:-http://localhost:3000}|g" {} \;
find /usr/share/nginx/html -type f -name "*.js" -exec sed -i "s|http://localhost:4200|${URL_FRONTEND:-http://localhost:4200}|g" {} \;

echo "✅ Variables d'environnement remplacées avec succès"
echo "Frontend URL: ${URL_FRONTEND:-http://localhost:4200}"
echo "Backend URL: ${URL_BACKEND:-http://localhost:3000/data}"

echo "🚀 Démarrage de Nginx..."
exec "$@" 