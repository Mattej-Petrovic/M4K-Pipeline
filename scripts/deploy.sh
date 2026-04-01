#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/deploy.sh [image-tag]
TAG=${1:-local-v2}
K8S_DIR="infra/k8s"

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "Building image m4k-pipeline:$TAG"
docker build -t m4k-pipeline:$TAG .

if command -v kind >/dev/null 2>&1; then
  echo "Loading image into kind cluster 'boiler-room'"
  kind load docker-image m4k-pipeline:$TAG --name boiler-room
elif command -v minikube >/dev/null 2>&1; then
  echo "Loading image into minikube"
  minikube image load m4k-pipeline:$TAG
else
  echo "No kind/minikube detected; ensure cluster can access local images or push to a registry"
fi

echo "Applying kustomize manifests (image tag: $TAG)"
# Write patch file with APP_VERSION so app reads deployed tag.
mkdir -p "$K8S_DIR/patches"
cat > "$K8S_DIR/patches/configmap-version.yaml" <<EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: first-pipeline-config
  namespace: boiler-room
data:
  APP_VERSION: "${TAG}"
EOF

kubectl apply -k "$K8S_DIR/" --validate=false

echo "Waiting for deployment rollout"
kubectl -n boiler-room rollout status deployment/first-pipeline --timeout=120s || true

echo "Patching deployment to trigger restart so pods pick up new ConfigMap..."
kubectl -n boiler-room patch deployment first-pipeline -p \
  "{\"spec\":{\"template\":{\"metadata\":{\"annotations\":{\"restartedAt\":\"$(date -Iseconds)\"}}}}}"
kubectl -n boiler-room rollout status deployment/first-pipeline --timeout=120s || true

echo "Done."
