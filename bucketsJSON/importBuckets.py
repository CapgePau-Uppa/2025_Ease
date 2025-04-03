import os
import json
import time
import sys
from couchbase.cluster import Cluster
from couchbase.options import ClusterOptions
from couchbase.auth import PasswordAuthenticator
from couchbase.management.buckets import CreateBucketSettings
from couchbase.exceptions import BucketAlreadyExistsException, DocumentExistsException

# Forcer l'encodage UTF-8 pour la sortie console
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

# Configuration Couchbase
COUCHBASE_HOST = "couchbase://localhost"
COUCHBASE_USER = "user1"
COUCHBASE_PASSWORD = "password"

# Dossier contenant les fichiers JSON
EXPORT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "exportedBucketsData")

# Connexion au cluster Couchbase
cluster = Cluster(COUCHBASE_HOST, ClusterOptions(PasswordAuthenticator(COUCHBASE_USER, COUCHBASE_PASSWORD)))

# Fonction pour lire les fichiers JSON et retourner les données
def load_json_data():
    bucket_data = {}
    for file_name in os.listdir(EXPORT_DIR):
        if file_name.endswith("_export.json"):
            bucket_name = file_name.replace("_export.json", "")
            file_path = os.path.join(EXPORT_DIR, file_name)
            try:
                with open(file_path, "r", encoding="utf-8") as file:
                    bucket_data[bucket_name] = json.load(file)
                print(f"[INFO] Données chargées depuis {file_name}")
            except Exception as e:
                print(f"[ERREUR] Erreur lors de la lecture de {file_name} : {e}")
    return bucket_data

# Fonction pour créer un bucket s'il n'existe pas
def create_bucket(cluster, bucket_name):
    bucket_manager = cluster.buckets()
    try:
        existing_buckets = [bucket.name for bucket in bucket_manager.get_all_buckets()]
        if bucket_name not in existing_buckets:
            bucket_manager.create_bucket(
                CreateBucketSettings(
                    name=bucket_name,
                    ram_quota_mb=100,
                    flush_enabled=True
                )
            )
            print(f"[SUCCES] Bucket '{bucket_name}' créé avec succès.")
            time.sleep(5)  # Attendre que le bucket soit disponible
        else:
            print(f"[AVERTISSEMENT] Le bucket '{bucket_name}' existe déjà.")
    except BucketAlreadyExistsException:
        print(f"[AVERTISSEMENT] Le bucket '{bucket_name}' existe déjà.")
    except Exception as e:
        print(f"[ERREUR] Erreur lors de la création du bucket '{bucket_name}' : {e}")

# Fonction pour insérer des documents dans un bucket
def insert_documents(cluster, bucket_name, documents):
    try:
        bucket = cluster.bucket(bucket_name)
        collection = bucket.scope("_default").collection("_default")  # Collection par défaut
        time.sleep(2)  # Attendre que le bucket soit prêt

        for doc in documents:
            doc_id = str(doc.get("id", doc.get("uuid", doc.get("_id", None))))  # Vérification de l'ID
            if not doc_id:
                print(f"[AVERTISSEMENT] Document sans identifiant ignoré : {doc}")
                continue
            
            try:
                collection.upsert(doc_id, doc)
                print(f"[SUCCES] Document inséré dans {bucket_name} avec ID : {doc_id}")
            except DocumentExistsException:
                print(f"[AVERTISSEMENT] Document avec ID {doc_id} existe déjà.")
            except Exception as e:
                print(f"[ERREUR] Erreur lors de l'insertion dans {bucket_name} : {e}")

    except Exception as e:
        print(f"[ERREUR] Impossible d'accéder au bucket '{bucket_name}' : {e}")

# Charger les fichiers JSON
buckets_data = load_json_data()

# Créer les buckets et insérer les documents
for bucket_name, documents in buckets_data.items():
    create_bucket(cluster, bucket_name)  # Crée le bucket s'il n'existe pas
    insert_documents(cluster, bucket_name, documents)  # Insère les documents

print("[TERMINE] Importation terminée !")
