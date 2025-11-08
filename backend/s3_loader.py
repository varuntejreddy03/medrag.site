import boto3
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

def download_from_s3():
    """Download large model files from S3 if not present locally"""
    s3 = boto3.client(
        's3',
        region_name=os.getenv('AWS_REGION', 'us-east-1'),
        aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
        aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY')
    )
    bucket = os.getenv('S3_BUCKET_NAME', 'medrag-data-bucket')
    
    files = [
        'chunked_ehr_index.faiss',
        'patient_chunks.json',
        'release_evidences.json'
    ]
    
    models_dir = Path('models')
    models_dir.mkdir(exist_ok=True)
    
    for file in files:
        local_path = models_dir / file
        if not local_path.exists():
            print(f"Downloading {file} from S3...")
            try:
                s3.download_file(bucket, file, str(local_path))
                print(f"✅ Downloaded {file}")
            except Exception as e:
                print(f"⚠️ Failed to download {file}: {e}")
