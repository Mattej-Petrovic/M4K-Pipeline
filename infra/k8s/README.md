Kubernetes manifests for M4K-Pipeline
=============================

This folder contains Kubernetes manifests to run the `first-pipeline` Node.js app locally.

Files:
- `namespace.yaml` - Namespace `boiler-room` for isolation
- `configmap.yaml` - Environment variables (PORT)
- `backend-deployment.yaml` - Deployment (2 replicas) with liveness/readiness probes and resource limits
- `backend-service.yaml` - NodePort service exposing port `30030` on the node
- `kustomization.yaml` - kustomize wrapper to apply all manifests and change image tag
- `rbac/` - extra RBAC manifests kept separately from the main app deployment

Quick start (kind)

1. Build the image locally:

```bash
docker build -t m4k-pipeline:local .
```

2. Load into kind (replace cluster name if different):

```bash
kind load docker-image m4k-pipeline:local --name boiler-room
```

3. Apply manifests:

```bash
# using kustomize wrapper (recommended)
$ ./scripts/deploy.sh local-v2

# or directly
$ kubectl apply -f infra/k8s/ --validate=false
```

4. Verify:

```bash
kubectl get all -n boiler-room
kubectl get pods -n boiler-room
```

5. Port-forward to test locally (alternative to NodePort):

```bash
kubectl port-forward service/first-pipeline 3000:3000 -n boiler-room
curl http://localhost:3000/health
```

Scaling and rollout examples:

```bash
# Scale to 4 replicas
kubectl scale deployment/first-pipeline --replicas=4 -n boiler-room

# Update image (after pushing/loading new image)
kubectl set image deployment/first-pipeline first-pipeline=m4k-pipeline:local-v2 -n boiler-room
kubectl rollout status deployment/first-pipeline -n boiler-room

# Rollback
kubectl rollout undo deployment/first-pipeline -n boiler-room
```

Maintenance & cleanup
```bash
# Delete ReplicaSets with 0 replicas (cleanup old RS)
kubectl -n boiler-room get rs --no-headers -o custom-columns=NAME:.metadata.name,REPLICAS:.status.replicas | awk '$2=="0" {print $1}' | xargs -r -n1 kubectl -n boiler-room delete rs

# Or use the provided script to delete zero-replica ReplicaSets
./scripts/cleanup-old-rs.sh boiler-room
```

Notes:
- The deployment uses `m4k-pipeline:local` as the image name; local clusters (kind/minikube) need the image loaded.
- NodePort `30030` is provided so you can access the service via the node IP, but `kubectl port-forward` is simpler for demos.
