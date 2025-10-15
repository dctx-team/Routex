# Helm Chart Installation Guide

## Installation

### Install from local chart

```bash
helm install routex ./deploy/helm/routex -n routex --create-namespace
```

### Install with custom values

```bash
helm install routex ./deploy/helm/routex \
  -n routex \
  --create-namespace \
  -f custom-values.yaml
```

### Install with inline values

```bash
helm install routex ./deploy/helm/routex \
  -n routex \
  --create-namespace \
  --set image.tag=1.1.0-beta \
  --set service.type=LoadBalancer \
  --set persistence.size=5Gi
```

## Upgrade

```bash
helm upgrade routex ./deploy/helm/routex -n routex
```

## Uninstall

```bash
helm uninstall routex -n routex
```

## Configuration

See `values.yaml` for all available configuration options.

### Example: Enable Ingress

```yaml
ingress:
  enabled: true
  className: nginx
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
  hosts:
    - host: routex.yourdomain.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: routex-tls
      hosts:
        - routex.yourdomain.com
```

### Example: Custom Resources

```yaml
resources:
  limits:
    cpu: 1000m
    memory: 1Gi
  requests:
    cpu: 200m
    memory: 256Mi
```

### Example: Enable Autoscaling

```yaml
autoscaling:
  enabled: true
  minReplicas: 1
  maxReplicas: 5
  targetCPUUtilizationPercentage: 70
```

## Testing

Test the Helm chart:

```bash
# Lint the chart
helm lint ./deploy/helm/routex

# Dry run
helm install routex ./deploy/helm/routex --dry-run --debug -n routex

# Template output
helm template routex ./deploy/helm/routex -n routex
```
