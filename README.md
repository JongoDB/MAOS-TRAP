# MAOS TRAP - MITRE ATT&CK Apps Platform

A containerized deployment platform for MITRE ATT&CK applications with an integrated management console.

## Overview

MAOS TRAP (MITRE ATT&CK Operations Security Threat Response & Analysis Platform) provides a unified interface for deploying and accessing multiple MITRE ATT&CK tools and applications. The platform includes:

- **ATT&CK Website** - Complete MITRE ATT&CK knowledge base
- **ATT&CK Navigator** - Interactive layer-based visualization and annotation tool
- **Attack Flow Builder** - Design and document attack flows
- **Attack Flow Visualizations** - Render attack flows as timelines, matrices, and treemaps
- **System Metrics API** - Real-time host system monitoring
- **Management Console** - Unified web interface for accessing all applications

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Nginx Proxy                          │
│                  (Ports 80/443)                          │
└──────────────┬──────────────────────────────────────────┘
               │
    ┌──────────┼──────────┬──────────┬──────────┐
    │          │          │          │          │
    ▼          ▼          ▼          ▼          ▼
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│ATT&CK  │ │ATT&CK  │ │Attack  │ │Attack  │ │System  │
│Website │ │Nav     │ │Flow    │ │Flow Viz│ │Metrics │
└────────┘ └────────┘ └────────┘ └────────┘ └────────┘
```

## Prerequisites

- Docker Engine 20.10+
- Docker Compose v2.0+
- 8GB RAM minimum (16GB recommended)
- 20GB free disk space

## Quick Start

1. Clone the repository:
```bash
git clone <repository-url>
cd mitre-attack-apps
```

2. Generate SSL certificates (optional, for HTTPS):
```bash
mkdir -p nginx/certs
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/certs/maos-trap.key \
  -out nginx/certs/maos-trap.crt
```

3. Start all services:
```bash
docker compose up -d
```

4. Access the console:
- HTTP: http://localhost
- HTTPS: https://localhost

## Services

### ATT&CK Website (v1.3.1)
Browse the full MITRE ATT&CK knowledge base including tactics, techniques, groups, software, and mitigations.
- **URL**: `/attack-website/`
- **Port**: Internal 80
- **Source**: https://github.com/mitre-attack/attack-website

### ATT&CK Navigator (v1.3.3)
Create and share ATT&CK Navigator layers for visualization and annotation.
- **URL**: `/attack-navigator/`
- **Port**: Internal 80
- **Source**: https://github.com/mitre-attack/attack-navigator

### Attack Flow Builder (v1.3.0)
Design and manage Attack Flows to capture adversary tradecraft.
- **URL**: `/attack-flow/`
- **Port**: Internal 80
- **Source**: https://github.com/center-for-threat-informed-defense/attack-flow

### Attack Flow Visualizations (v1.3.0)
Render Attack Flow artifacts as timelines, matrices, and treemaps.
- **URL**: `/attack-flow-viz/`
- **Port**: Internal 80

### System Metrics (v1.3.0)
FastAPI service providing real-time host system metrics.
- **URL**: `/api/system-metrics`
- **Port**: Internal 9000

## Configuration

### Environment Variables

No environment variables are required for basic operation. All services are pre-configured.

### Nginx Configuration

The nginx reverse proxy is configured at `nginx/nginx.conf`. Key settings:

- TLS certificates: `nginx/certs/`
- Landing page: `nginx/landing.html`
- Docker DNS resolver for service discovery

### Persistent Data

The following Docker volumes are created:
- None by default (stateless deployment)

## Development

### Building Individual Services

```bash
# Build specific service
docker compose build attack-website

# Build without cache
docker compose build --no-cache attack-navigator
```

### Viewing Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f attack-navigator

# Last 100 lines
docker compose logs --tail=100 nginx
```

### Updating Services

To update to the latest versions:

```bash
# Pull latest changes
git pull

# Rebuild and restart
docker compose up -d --build
```

## Maintenance

### Health Checks

Nginx health endpoint:
```bash
curl -k https://localhost/healthz
```

System metrics:
```bash
curl -k https://localhost/api/system-metrics
```

### Backup and Restore

Since this is a stateless deployment, no backup is required. Configuration files can be version controlled with git.

### Updating Base Images

The GitHub Actions workflow automatically checks for updated base images daily and rebuilds containers when updates are available.

## Troubleshooting

### Port Conflicts

If ports 80 or 443 are already in use:

```bash
# Check what's using the ports
sudo lsof -i :80
sudo lsof -i :443

# Edit docker-compose.yml to use different ports
# Then restart
docker compose down && docker compose up -d
```

### Container Won't Start

```bash
# Check container logs
docker compose logs <service-name>

# Restart specific service
docker compose restart <service-name>

# Full reset
docker compose down
docker compose up -d --force-recreate
```

### Hostname Not Displaying Correctly

The system-metrics service reads the host's hostname from `/etc/hostname`. Ensure the container has read access to the host filesystem:

```bash
# Verify mount
docker inspect system-metrics | grep -A 10 Mounts
```

## CI/CD

This repository includes GitHub Actions workflows for:

- **Container Builds**: Automatically rebuilds containers when code changes
- **Base Image Updates**: Daily checks for updated base images
- **Version Management**: Auto-increments version on releases
- **Testing**: Validates docker-compose configuration

See `.github/workflows/` for workflow definitions.

## Version History

Current Version: **1.4.0**

See [CHANGELOG.md](CHANGELOG.md) for detailed version history.

## Security

### SSL/TLS

- HTTPS is enabled by default with self-signed certificates
- For production, replace certificates in `nginx/certs/` with CA-signed certificates
- HTTP traffic is redirected to HTTPS

### Container Security

- All services run as non-root users where possible
- Read-only filesystem mounts for static content
- Minimal base images to reduce attack surface

### Network Security

- Services communicate via internal Docker network
- Only nginx proxy exposes ports to host
- No services expose unnecessary ports

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -am 'Add new feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Submit a pull request

## License

This platform integrates multiple open-source projects:

- MITRE ATT&CK Website: Apache 2.0
- MITRE ATT&CK Navigator: Apache 2.0
- Attack Flow: Apache 2.0

See individual project directories for specific license information.

## Acknowledgments

- [MITRE ATT&CK](https://attack.mitre.org/)
- [MITRE ATT&CK Navigator](https://github.com/mitre-attack/attack-navigator)
- [Center for Threat-Informed Defense](https://ctid.mitre-engenuity.org/)

## Support

For issues and questions:
- Open an issue on GitHub
- Check existing issues for solutions
- Review troubleshooting section above

## Roadmap

- [ ] Add authentication/authorization layer
- [ ] Implement persistent storage for Navigator layers
- [ ] Add Prometheus metrics export
- [ ] Create Kubernetes deployment manifests
- [ ] Add automated security scanning
