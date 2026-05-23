FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY app/ ./app/
COPY alembic/ ./alembic/
COPY alembic.ini ./

# Create data directory
RUN groupadd --gid 1001 app \
    && useradd --uid 1001 --gid app --create-home app \
    && mkdir -p /app/data \
    && chown -R app:app /app

USER app

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/health', timeout=3)"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
