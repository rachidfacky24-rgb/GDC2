FROM python:3.11-slim
WORKDIR /app

# System deps
RUN apt-get update && apt-get install -y build-essential && rm -rf /var/lib/apt/lists/*

# Copy project
COPY . /app

# Install python deps
RUN pip install --no-cache-dir -r requirements.txt

EXPOSE 5000
CMD ["gunicorn", "backend.app:app", "--bind", "0.0.0.0:5000", "--workers", "2"]
