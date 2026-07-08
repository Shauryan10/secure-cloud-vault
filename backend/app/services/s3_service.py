import boto3
import uuid
from os import getenv
from dotenv import load_dotenv

load_dotenv()

s3 = boto3.client(
    "s3",
    aws_access_key_id=getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=getenv("AWS_SECRET_ACCESS_KEY"),
    region_name=getenv("AWS_REGION")
)

BUCKET_NAME = getenv("S3_BUCKET")


def upload_file(file_obj, filename: str):

    extension = filename.split(".")[-1]

    key = f"{uuid.uuid4()}.{extension}"

    s3.upload_fileobj(
        file_obj,
        BUCKET_NAME,
        key
    )

    return key


def download_file(key: str):

    return s3.get_object(
        Bucket=BUCKET_NAME,
        Key=key
    )


def delete_file(key: str):

    s3.delete_object(
        Bucket=BUCKET_NAME,
        Key=key
    )