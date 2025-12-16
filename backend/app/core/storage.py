import os
import uuid
import aiofiles
from typing import Optional, BinaryIO
from pathlib import Path
from abc import ABC, abstractmethod
from loguru import logger
from app.config import settings

class StorageClient(ABC):
    @abstractmethod
    async def upload_file(self, file_content: bytes, filename: str, content_type: str) -> str:
        pass
    
    @abstractmethod
    async def download_file(self, file_id: str) -> Optional[bytes]:
        pass
    
    @abstractmethod
    async def get_presigned_url(self, file_id: str, expires_in: int = 3600) -> Optional[str]:
        pass
    
    @abstractmethod
    async def delete_file(self, file_id: str) -> bool:
        pass

class LocalStorageClient(StorageClient):
    def __init__(self, storage_path: str):
        self.storage_path = Path(storage_path)
        self.storage_path.mkdir(parents=True, exist_ok=True)
    
    async def upload_file(self, file_content: bytes, filename: str, content_type: str) -> str:
        try:
            # Generate unique file ID
            file_id = str(uuid.uuid4())
            file_extension = Path(filename).suffix
            stored_filename = f"{file_id}{file_extension}"
            file_path = self.storage_path / stored_filename
            
            # Write file asynchronously
            async with aiofiles.open(file_path, 'wb') as f:
                await f.write(file_content)
            
            logger.info(f"File uploaded successfully: {file_id}")
            return file_id
            
        except Exception as e:
            logger.error(f"Failed to upload file: {e}")
            raise
    
    async def download_file(self, file_id: str) -> Optional[bytes]:
        try:
            # Find file with this ID (check all extensions)
            for file_path in self.storage_path.glob(f"{file_id}.*"):
                async with aiofiles.open(file_path, 'rb') as f:
                    content = await f.read()
                return content
            
            logger.warning(f"File not found: {file_id}")
            return None
            
        except Exception as e:
            logger.error(f"Failed to download file {file_id}: {e}")
            return None
    
    async def get_presigned_url(self, file_id: str, expires_in: int = 3600) -> Optional[str]:
        # For local storage, return a direct file path or API endpoint
        # In production, this would be a signed URL
        for file_path in self.storage_path.glob(f"{file_id}.*"):
            return f"/api/v1/files/{file_id}"
        return None
    
    async def delete_file(self, file_id: str) -> bool:
        try:
            for file_path in self.storage_path.glob(f"{file_id}.*"):
                file_path.unlink()
                logger.info(f"File deleted: {file_id}")
                return True
            return False
        except Exception as e:
            logger.error(f"Failed to delete file {file_id}: {e}")
            return False

class S3StorageClient(StorageClient):
    def __init__(self, bucket_name: str, access_key: str, secret_key: str, region: str):
        self.bucket_name = bucket_name
        self.access_key = access_key
        self.secret_key = secret_key
        self.region = region
        # TODO: Initialize boto3 client
    
    async def upload_file(self, file_content: bytes, filename: str, content_type: str) -> str:
        # TODO: Implement S3 upload
        raise NotImplementedError("S3 storage not implemented yet")
    
    async def download_file(self, file_id: str) -> Optional[bytes]:
        # TODO: Implement S3 download
        raise NotImplementedError("S3 storage not implemented yet")
    
    async def get_presigned_url(self, file_id: str, expires_in: int = 3600) -> Optional[str]:
        # TODO: Implement S3 presigned URL
        raise NotImplementedError("S3 storage not implemented yet")
    
    async def delete_file(self, file_id: str) -> bool:
        # TODO: Implement S3 delete
        raise NotImplementedError("S3 storage not implemented yet")

class StorageClientFactory:
    @staticmethod
    def create_client() -> StorageClient:
        provider = settings.storage_provider.lower()
        
        if provider == "s3":
            if all([settings.aws_access_key_id, settings.aws_secret_access_key, settings.aws_bucket_name]):
                logger.info("Using S3 storage client")
                return S3StorageClient(
                    bucket_name=settings.aws_bucket_name,
                    access_key=settings.aws_access_key_id,
                    secret_key=settings.aws_secret_access_key,
                    region=settings.aws_region
                )
            else:
                logger.warning("S3 credentials not configured, falling back to local storage")
        
        # Default to local storage
        logger.info("Using local storage client")
        return LocalStorageClient(settings.storage_path)

def validate_file_type(filename: str) -> bool:
    """Validate if file type is allowed"""
    file_extension = Path(filename).suffix.lower().lstrip('.')
    return file_extension in settings.allowed_file_types_list

def validate_file_size(file_size: int) -> bool:
    """Validate if file size is within limits"""
    max_size_bytes = settings.max_file_size_mb * 1024 * 1024
    return file_size <= max_size_bytes

# Global storage client instance
storage_client = StorageClientFactory.create_client()