#!/bin/bash
set -e

# Remplacer les variables d'environnement dans index.html
echo "Remplacement des variables d'environnement..."

# Copier le fichier d'environnement Docker à la place de l'environnement par défaut
cp /usr/share/nginx/html/assets/environments/environment.docker.js /usr/share/nginx/html/assets/environments/environment.js

echo "Configuration terminée."

# Démarrer Nginx
exec "$@"