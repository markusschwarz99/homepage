FROM python:3.12-slim

WORKDIR /app

# pip auf aktuelle Version updaten (behebt bekannte CVEs)
RUN pip install --no-cache-dir --upgrade pip

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Non-root user für bessere Container-Isolation
RUN useradd --create-home --shell /bin/bash app \
    && mkdir -p /app/uploads \
    && chown -R app:app /app
USER app

CMD ["./entrypoint.sh"]
