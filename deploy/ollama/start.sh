#!/bin/sh
set -eu

MODEL="${OLLAMA_MODEL:-qwen2.5:0.5b}"

echo "Starting Ollama on ${OLLAMA_HOST:-0.0.0.0:11434}..."
ollama serve &
OLLAMA_PID=$!

echo "Waiting for Ollama to become ready..."
for i in $(seq 1 60); do
  if ollama list >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

echo "Pulling model: ${MODEL}"
ollama pull "${MODEL}"

echo "Ollama is ready with model ${MODEL}"
wait "${OLLAMA_PID}"
