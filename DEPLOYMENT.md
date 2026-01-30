# Deployment Guide

## Initial GitHub Setup

### 1. Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `MAOS-TRAP`
3. Description: `MITRE and Other Stuff - Containerized MITRE ATT&CK Apps Platform`
4. Visibility: Choose Public or Private
5. Do NOT initialize with README, .gitignore, or license (we already have these)
6. Click "Create repository"

### 2. Push to GitHub

```bash
# Add GitHub remote
git remote add origin https://github.com/JongoDB/MAOS-TRAP.git

# Rename branch to main (if not already)
git branch -M main

# Push to GitHub
git push -u origin main
```

### 3. Enable GitHub Actions

GitHub Actions workflows will automatically run after the first push:

- **build-containers.yml** - Builds container images on code changes
- **check-base-images.yml** - Checks for base image updates daily
- **version-bump.yml** - Auto-increments version on releases

### 4. Configure GitHub Secrets (Optional)

For container registry access:

1. Go to Repository Settings → Secrets and variables → Actions
2. The workflows use `GITHUB_TOKEN` which is automatically provided
3. For custom registries, add additional secrets as needed

## GitHub Container Registry (GHCR)

Container images will be pushed to:
```
ghcr.io/jongodb/maos-trap/attack-website:1.3.1
ghcr.io/jongodb/maos-trap/attack-navigator:1.3.3
ghcr.io/jongodb/maos-trap/attack-flow:1.3.0
ghcr.io/jongodb/maos-trap/attack-flow-viz:1.3.0
ghcr.io/jongodb/maos-trap/system-metrics:1.3.0
```

### Enable GHCR

1. Go to your GitHub profile → Settings → Developer settings → Personal access tokens
2. Generate new token (classic) with `write:packages` and `read:packages` scopes
3. The GitHub Actions workflows will use the automatic `GITHUB_TOKEN` for authentication

## Automated Workflows

### Build on Code Changes

Triggers: Push to `main` or `develop` branches, or manual workflow dispatch

What it does:
- Builds all container images
- Pushes to GitHub Container Registry
- Runs health checks in PR builds

### Daily Base Image Checks

Triggers: Daily at 2 AM UTC, or manual dispatch

What it does:
- Pulls latest base images (nginx, node, python)
- Detects if updates are available
- Creates a PR with rebuild trigger if updates found

### Version Management

Triggers: Push to `main` branch, or manual dispatch

What it does:
- Extracts current version from `nginx/landing.html`
- Increments version (patch/minor/major)
- Updates landing page and CHANGELOG.md
- Creates git tag for release

To manually trigger a version bump:
1. Go to Actions → Version Bump workflow
2. Click "Run workflow"
3. Choose bump type (patch/minor/major)

## Updating Container Versions

When MITRE releases new versions:

1. Update the base repositories (submodules or git pull in subdirectories)
2. Update version numbers in `.github/workflows/build-containers.yml`
3. Commit and push changes
4. GitHub Actions will automatically rebuild containers

## Local Development

```bash
# Build specific service locally
docker compose build attack-navigator

# Test locally before pushing
docker compose up -d
curl -k https://localhost/healthz

# View build logs
docker compose logs -f
```

## Deployment to Production

### Option 1: Docker Compose (Recommended for single host)

```bash
# On production server
git clone https://github.com/JongoDB/MAOS-TRAP.git
cd MAOS-TRAP

# Generate SSL certificates
mkdir -p nginx/certs
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/certs/maos-trap.key \
  -out nginx/certs/maos-trap.crt

# Start services
docker compose up -d

# Check status
docker compose ps
curl -k https://localhost/healthz
```

### Option 2: Pull from GHCR

```bash
# Login to GHCR (if private repo)
echo $GITHUB_TOKEN | docker login ghcr.io -u JongoDB --password-stdin

# Pull specific image
docker pull ghcr.io/jongodb/maos-trap/attack-navigator:1.3.3

# Or let docker-compose pull all images
docker compose pull
docker compose up -d
```

## Monitoring

### View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f nginx

# Last 100 lines
docker compose logs --tail=100 attack-navigator
```

### Health Checks

```bash
# Nginx health
curl -k https://localhost/healthz

# System metrics
curl -k https://localhost/api/system-metrics | jq

# Container status
docker compose ps
```

### Restart Services

```bash
# Restart specific service
docker compose restart attack-navigator

# Restart all
docker compose restart

# Full recreation
docker compose down && docker compose up -d
```

## Troubleshooting

### Workflow Failures

Check GitHub Actions logs:
1. Go to repository → Actions tab
2. Click on failed workflow run
3. Review logs for each job/step

Common issues:
- Docker build failures: Check Dockerfile syntax
- Push failures: Verify GHCR permissions
- Test failures: Check service health and logs

### Container Build Issues

```bash
# Clear build cache
docker builder prune -a

# Rebuild without cache
docker compose build --no-cache

# Check Docker disk space
docker system df
```

### Port Conflicts

If ports 80/443 are in use:

```bash
# Find what's using the ports
sudo lsof -i :80
sudo lsof -i :443

# Either stop the conflicting service or change ports in docker-compose.yml
```

## Security Considerations

1. **SSL Certificates**: Replace self-signed certificates with CA-signed certificates in production
2. **Container Registry**: Consider using private registry for sensitive deployments
3. **Secrets Management**: Never commit secrets to git
4. **Access Control**: Implement authentication proxy if exposing to internet
5. **Updates**: Enable automated base image updates to get security patches

## Backup and Restore

This is a stateless deployment, so backup consists of:

1. Git repository (code and configuration)
2. SSL certificates (if not using self-signed)
3. Any custom configurations

To backup:
```bash
# Clone repository
git clone https://github.com/JongoDB/MAOS-TRAP.git

# Backup certificates
tar -czf certificates-backup.tar.gz nginx/certs/
```

## Additional Resources

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [MITRE ATT&CK](https://attack.mitre.org/)
- [ATT&CK Navigator](https://github.com/mitre-attack/attack-navigator)
- [Attack Flow](https://github.com/center-for-threat-informed-defense/attack-flow)
