#!/usr/bin/env bash
set -euo pipefail
# Installs/downloads the official k6 Docker image; does NOT install Docker Engine.
IMAGE="${K6_DOCKER_IMAGE:-grafana/k6:latest}"
if [[ ! "$IMAGE" =~ ^grafana/k6:([a-zA-Z0-9_.-]+)$ && ! "$IMAGE" =~ ^grafana/k6@sha256:([a-f0-9]{64})$ ]]; then
  echo "[k6] Refusing non-official Docker image: $IMAGE" >&2
  exit 2
fi
if ! command -v docker >/dev/null 2>&1; then
  echo '[k6] Docker CLI not installed. Install Docker Engine + Compose plugin first.' >&2
  exit 2
fi
if ! docker info --format '{{.ServerVersion}}' >/dev/null 2>&1; then
  echo '[k6] Docker daemon is not accessible. Start Docker or check user permissions.' >&2
  exit 2
fi
printf '[k6] Pulling %s\n' "$IMAGE"
docker pull "$IMAGE"
printf '[k6] Verifying k6 binary...\n'
docker run --rm "$IMAGE" version
printf '[k6] Ready: %s\n' "$IMAGE"
