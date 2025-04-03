import os
from couchbase.cluster import Cluster
from couchbase.options import ClusterOptions
from couchbase.auth import PasswordAuthenticator
import json

def export_bucket(bucket_name):
    # Get the directory of the current script
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Create the BucketJSON folder in the same directory as the script
    bucket_json_dir = os.path.join(script_dir, 'exportedBucketsData')
    os.makedirs(bucket_json_dir, exist_ok=True)
    
    cluster = Cluster('couchbase://localhost',
                      ClusterOptions(PasswordAuthenticator('user1', 'password')))
   
    bucket = cluster.bucket(bucket_name)
    collection = bucket.default_collection()
   
    # Retrieve all documents
    results = []
    query = f"SELECT * FROM `{bucket_name}`"
    result = cluster.query(query)
   
    for row in result:
        results.append(row[bucket_name])
   
    # Full path of the file in the BucketJSON folder
    export_path = os.path.join(bucket_json_dir, f'{bucket_name}_export.json')
    
    # Export as JSON
    with open(export_path, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
   
    print(f"Exported {len(results)} documents to {export_path}")

# Export all buckets
export_bucket('UsersBDD')
export_bucket('ProductsBDD')
export_bucket('CategoryBDD')
export_bucket('BrandsBDD')