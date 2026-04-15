FROM python:3.11-slim

# Create a non-root user that Hugging Face Spaces requires
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

WORKDIR $HOME/app

# Copy requirements and install them securely
COPY --chown=user:user requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy the entire backend directory into the container
# Important: We copy the whole 'minirag' folder so Python imports like 'from minirag.backend.X' still work!
COPY --chown=user:user ../../minirag/ $HOME/app/minirag/

# Set Python path to ensure module resolution works natively
ENV PYTHONPATH=$HOME/app

# HF requires apps to run on port 7860
EXPOSE 7860

# Start FastAPI exactly like we do locally, but hardcoded to HF's required port
CMD ["uvicorn", "minirag.backend.main:app", "--host", "0.0.0.0", "--port", "7860"]
