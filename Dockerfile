FROM python:3.11-slim

# Create a non-root user that Hugging Face Spaces requires
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

WORKDIR $HOME/app

# Copy requirements and install them
COPY --chown=user:user minirag/backend/requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy the entire project so imports work
COPY --chown=user:user . $HOME/app/

# Set Python path
ENV PYTHONPATH=$HOME/app

# HF requires apps to run on port 7860
EXPOSE 7860

# Start FastAPI
CMD ["uvicorn", "minirag.backend.main:app", "--host", "0.0.0.0", "--port", "7860"]
