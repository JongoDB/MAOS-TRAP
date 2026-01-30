# --- Stage 1: Build the search bundle ---
FROM node:18 as node-build
WORKDIR /app

# Copy package files and webpack config
COPY attack-search/package*.json ./attack-search/
COPY attack-search/webpack.config.cjs ./attack-search/
# Copy source
COPY attack-search/src ./attack-search/src

# Install and build search bundle
RUN cd attack-search && npm ci && npm run build


# --- Stage 2: Build the ATT&CK website ---
FROM python:3.11-slim-bullseye as python-build

ARG CTI_TAG='ATT&CK-v17.1'
ARG OFFLINE=0
ARG SUBDIRECTORY=""

ENV DEBIAN_FRONTEND=noninteractive \
    LANG=en_US.UTF-8 \
    LC_ALL=en_US.UTF-8 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# System deps commonly needed for wheels (adjust if build complains)
RUN apt-get update --fix-missing && \
    apt-get upgrade -y && \
    apt-get install -y -qq --no-install-recommends \
        locales ca-certificates git curl \
        build-essential gcc \
        libffi-dev libssl-dev \
        libxml2-dev libxslt1-dev zlib1g-dev && \
    echo "en_US.UTF-8 UTF-8" > /etc/locale.gen && locale-gen && update-ca-certificates && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /home/attackuser/attack-website

# Copy the website source
COPY . .

# -----------------------------------------------------------------------------
# CTI data: online vs offline
# - ONLINE (default): clone MITRE/cti and checkout the pinned tag (e.g., ATT&CK-v17.1)
# - OFFLINE=1: assume ./cti is already included in build context (e.g., you cloned/pinned locally)
# -----------------------------------------------------------------------------
RUN if [ "$OFFLINE" = "1" ]; then \
        echo "[CTI] Offline mode: using local ./cti in build context"; \
        test -f cti/enterprise-attack/enterprise-attack.json || \
          (echo "Missing ./cti/* JSON files in build context" && exit 1); \
    else \
        echo "[CTI] Online mode: cloning MITRE/cti @ ${CTI_TAG}"; \
        rm -rf cti && git clone https://github.com/mitre/cti.git cti && \
        cd cti && git checkout "${CTI_TAG}"; \
    fi

# Force generator to use local CTI files (absolute paths; NO file://)
ENV STIX_LOCATION_ENTERPRISE=/home/attackuser/attack-website/cti/enterprise-attack/enterprise-attack.json
ENV STIX_LOCATION_MOBILE=/home/attackuser/attack-website/cti/mobile-attack/mobile-attack.json
ENV STIX_LOCATION_ICS=/home/attackuser/attack-website/cti/ics-attack/ics-attack.json
ENV STIX_LOCATION_PRE=/home/attackuser/attack-website/cti/pre-attack/pre-attack.json

# Python deps
RUN python -m pip install --upgrade pip setuptools wheel && \
    python -m pip install -r requirements.txt

# Build the website (uses local CTI + env above)
RUN if [ -n "$SUBDIRECTORY" ]; then \
        python update-attack.py --no-test-exitstatus --subdirectory "$SUBDIRECTORY"; \
    else \
        python update-attack.py --no-test-exitstatus; \
    fi

# Bring in the webpacked search bundle
COPY --from=node-build /app/attack-search/dist/search_bundle.js output/theme/scripts/search_bundle.js


# --- Stage 3: Runtime (Nginx) ---
FROM nginx:stable-alpine as production-stage

# Copy built site to web root
COPY --from=python-build /home/attackuser/attack-website/output /var/www/html

# Nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Labels
LABEL name="attack-website" \
      description="Dockerfile for the ATT&CK Website" \
      usage="https://github.com/mitre-attack/attack-website/blob/master/README.md#install-and-build" \
      url="https://attack.mitre.org/" \
      vcs-url="https://github.com/mitre-attack/attack-website" \
      vendor="MITRE ATT&CK" \
      maintainer="attack@mitre.org"

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
