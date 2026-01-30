# ---------- Build stage ----------
FROM node:18 AS build

# Base path where the app will live behind your outer proxy (must end with /)
ARG BASE_PATH=/navigator/
ENV BASE_PATH=${BASE_PATH}

WORKDIR /src/nav-app

# Install deps first for better caching
COPY nav-app/package*.json ./
RUN npm ci

# Copy source
COPY nav-app/ ./

# Build production bundle (Navigator expects aot/build-optimizer disabled)
RUN npx ng build \
    --configuration production \
    --aot=false \
    --build-optimizer=false \
    --base-href ${BASE_PATH} \
    --deploy-url ${BASE_PATH}

# ---------- Runtime stage ----------
FROM nginx:stable-alpine AS runtime

ARG BASE_PATH=/navigator/
ENV BASE_PATH=${BASE_PATH}

# Place the built app under /usr/share/nginx/html/navigator/
RUN mkdir -p /usr/share/nginx/html${BASE_PATH}
COPY --from=build /src/nav-app/dist/ /usr/share/nginx/html${BASE_PATH}

# --- SPA route fallback site (serve index.html for deep links) ---
# NOTE: unquoted heredoc so ${BASE_PATH} expands; escape $ for nginx vars.
RUN cat > /etc/nginx/conf.d/default.conf <<EOF
server {
  listen 80;
  server_name _;
  root /usr/share/nginx/html;

  # Serve SPA from BASE_PATH
  location ${BASE_PATH} {
    index index.html;
    try_files \$uri \$uri/ ${BASE_PATH}index.html;
  }

  # Static assets scoped to BASE_PATH
  location ${BASE_PATH}assets/ {
    try_files \$uri =404;
  }

  # Basic caching for built assets under BASE_PATH
  location ~* ^${BASE_PATH}.*\.(js|css|png|jpg|jpeg|gif|svg|woff2?)$ {
    try_files \$uri =404;
    expires 7d;
    add_header Cache-Control "public";
  }
}
EOF

# --- gzip config (safer than sed-editing nginx.conf) ---
RUN cat > /etc/nginx/conf.d/gzip.conf <<'EOF'
gzip on;
gzip_types text/css application/javascript application/json text/plain image/svg+xml;
EOF

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
