# Kubernetes Deployment Guide

This guide covers deploying Routex to Kubernetes clusters.

## Prerequisites

- Kubernetes cluster (v1.19+)
- kubectl configured
- Docker registry access (ghcr.io)

## Quick Deploy

### 1. Deploy with Full Configuration

```bash
kubectl apply -f deploy/kubernetes.yaml
```

### 2. Verify Deployment

```bash
# Check all resources
kubectl get all -n routex

# Check pod status
kubectl get pods -n routex

# View logs
kubectl logs -f -n routex -l app=routex
```

### 3. Access the Service

#### Option A: Port Forward (Development)
```bash
kubectl port-forward -n routex svc/routex 8080:8080
```
Access at: http://localhost:8080

#### Option B: NodePort (On-premise)
Edit the Service type in `kubernetes.yaml`:
```yaml
spec:
  type: NodePort
```

#### Option C: LoadBalancer (Cloud)
Edit the Service type in `kubernetes.yaml`:
```yaml
spec:
  type: LoadBalancer
```

#### Option D: Ingress (Production)
Configure your domain in the Ingress resource and apply.

## Configuration

### Environment Variables

The following environment variables can be configured:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | Server port |
| `HOST` | `0.0.0.0` | Listen address |
| `NODE_ENV` | `production` | Runtime environment |
| `DB_PATH` | `/data/routex.db` | Database path |

### Storage

By default, 1Gi PersistentVolume is provisioned. To change:

```yaml
spec:
  resources:
    requests:
      storage: 5Gi  # Change size here
```

### Resource Limits

Adjust resource limits based on your workload:

```yaml
resources:
  requests:
    memory: "128Mi"
    cpu: "100m"
  limits:
    memory: "512Mi"
    cpu: "500m"
```

## Private Registry

If using a private container registry:

```bash
# Create image pull secret
kubectl create secret docker-registry ghcr-secret \
  --docker-server=ghcr.io \
  --docker-username=YOUR_USERNAME \
  --docker-password=YOUR_TOKEN \
  --namespace=routex

# Add to deployment spec
spec:
  template:
    spec:
      imagePullSecrets:
      - name: ghcr-secret
```

## Ingress Configuration

### NGINX Ingress Controller

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: routex
  namespace: routex
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - routex.yourdomain.com
    secretName: routex-tls
  rules:
  - host: routex.yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: routex
            port:
              number: 8080
```

### Traefik Ingress Controller

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: routex
  namespace: routex
  annotations:
    traefik.ingress.kubernetes.io/router.entrypoints: websecure
spec:
  ingressClassName: traefik
  rules:
  - host: routex.yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: routex
            port:
              number: 8080
```

## Monitoring

### Health Checks

Routex exposes a health endpoint at `/health`:

```bash
kubectl exec -it -n routex <pod-name> -- curl http://localhost:8080/health
```

### Logs

```bash
# Follow logs
kubectl logs -f -n routex -l app=routex

# View recent logs
kubectl logs --tail=100 -n routex -l app=routex
```

### Metrics (Optional)

If using Prometheus:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: routex-metrics
  namespace: routex
  annotations:
    prometheus.io/scrape: "true"
    prometheus.io/port: "8080"
    prometheus.io/path: "/metrics"
```

## Backup & Restore

### Backup Database

```bash
# Copy database from pod
kubectl cp routex/<pod-name>:/data/routex.db ./routex-backup.db -n routex
```

### Restore Database

```bash
# Copy database to pod
kubectl cp ./routex-backup.db routex/<pod-name>:/data/routex.db -n routex

# Restart pod
kubectl rollout restart deployment/routex -n routex
```

## Scaling Considerations

⚠️ **Important**: Routex uses SQLite for data storage, which is not suitable for multi-replica deployments.

For high availability, consider:
1. Using a single replica with node affinity
2. Migrating to PostgreSQL/MySQL for production
3. Using StatefulSet instead of Deployment

## Troubleshooting

### Pod Not Starting

```bash
# Check pod events
kubectl describe pod -n routex -l app=routex

# Check logs
kubectl logs -n routex -l app=routex
```

### Permission Issues

```bash
# Check PVC status
kubectl get pvc -n routex

# Check PV permissions
kubectl exec -it -n routex <pod-name> -- ls -la /data
```

### Image Pull Errors

```bash
# Check image pull secrets
kubectl get secrets -n routex

# Verify image exists
docker pull ghcr.io/dctx-team/routex:1.1.0-beta
```

## Uninstall

```bash
# Delete all resources
kubectl delete -f deploy/kubernetes.yaml

# Or delete namespace
kubectl delete namespace routex
```

## Production Checklist

- [ ] Configure persistent storage with appropriate size
- [ ] Set up Ingress with TLS certificates
- [ ] Configure resource limits based on workload
- [ ] Set up monitoring and alerting
- [ ] Configure backup strategy
- [ ] Review security settings (NetworkPolicy, PodSecurityPolicy)
- [ ] Test health checks and readiness probes
- [ ] Document custom configuration

## Support

For issues and questions:
- GitHub Issues: https://github.com/dctx-team/Routex/issues
- Documentation: https://github.com/dctx-team/Routex/tree/main/docs
