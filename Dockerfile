FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt /app/requirements.txt
COPY risk_platform/requirements-api.txt /app/risk_platform/requirements-api.txt
RUN pip install --no-cache-dir -r requirements.txt -r risk_platform/requirements-api.txt

COPY src /app/src
COPY risk_platform /app/risk_platform
COPY scripts /app/scripts
COPY data/processed /app/data/processed

ENV PYTHONPATH=/app
WORKDIR /app/risk_platform/backend

EXPOSE 8000
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
