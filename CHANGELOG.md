# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4.0] - 2026-01-30

### Added
- Professional SVG icons replacing emojis throughout the UI
- MITRE-style mouse trap logo incorporating the iconic M design
- System metrics API for real-time host monitoring
- GitHub Actions workflows for automated builds and version management
- Comprehensive README with architecture documentation
- Docker DNS resolver for improved container name resolution

### Changed
- Updated attack-website to version 1.3.1
- Updated attack-navigator to version 1.3.3
- Improved hostname detection to read from host filesystem
- Redesigned landing page with professional aesthetics
- Removed unrelated services from nginx configuration
- Cleaned up attack-navigator to show default landing page (removed custom exports)

### Fixed
- Corrected Dockerfile paths in docker-compose.yml
- Fixed hostname parsing to display actual host name instead of container ID
- Updated exposed ports to 80/443 instead of 8080/8443

### Removed
- Circular gradient background on brand logo
- Custom navigator layer auto-loading
- References to external services in landing page

## [1.3.0] - 2025-12-05

### Initial Release
- Initial deployment with MITRE ATT&CK applications
- Basic nginx reverse proxy configuration
- Docker Compose orchestration
