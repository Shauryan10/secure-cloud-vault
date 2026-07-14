FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .

# Upgrade pip and setuptools first to get patched vendored deps (jaraco.context, wheel)
RUN pip install --no-cache-dir --upgrade pip setuptools

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
