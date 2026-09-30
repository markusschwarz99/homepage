FROM python:3.12-slim

WORKDIR /app

RUN pip install --no-cache-dir --upgrade pip

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Non-root user; /data ist das SQLite-Volume (übernimmt beim ersten Mount
# die Ownership aus dem Image).
RUN useradd --create-home --shell /bin/bash app \
    && mkdir -p /data \
    && chown -R app:app /app /data
USER app

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
