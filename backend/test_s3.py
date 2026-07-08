from app.services.s3_service import s3

response = s3.list_buckets()

print(response)