FROM python:3.9-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY agents/ ./agents/
COPY gateway/ ./gateway/
COPY shared/ ./shared/
COPY tools/ ./tools/

# Expose port
EXPOSE 8080

# Run FastAPI with uvicorn
CMD ["uvicorn", "gateway.main:app", "--host", "0.0.0.0", "--port", "8080"]
