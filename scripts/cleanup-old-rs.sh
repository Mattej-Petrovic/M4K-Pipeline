#!/usr/bin/env bash
set -euo pipefail

NS=${1:-boiler-room}
echo "Cleaning up ReplicaSets with 0 replicas in namespace: $NS"

RS_LIST=$(kubectl -n "$NS" get rs -o jsonpath='{range .items[?(@.status.replicas==0)]}{.metadata.name}{"\n"}{end}')

if [ -z "${RS_LIST}" ]; then
  echo "No ReplicaSets with 0 replicas found in namespace $NS"
  exit 0
fi

echo "Found ReplicaSets to delete:"
echo "$RS_LIST"

while read -r RS; do
  if [ -n "$RS" ]; then
    echo "Deleting ReplicaSet: $RS"
    kubectl -n "$NS" delete rs "$RS" || echo "Failed to delete $RS"
  fi
done <<< "$RS_LIST"

echo "Cleanup complete."
