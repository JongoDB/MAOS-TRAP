FROM node:20 AS builder

ARG AFB_BASE_URL=/attack-flow/
ENV AFB_BASE_URL=${AFB_BASE_URL}

COPY src/attack_flow_builder /attack_flow_builder
WORKDIR /attack_flow_builder
RUN npm ci
# TODO temporarily disable type checking
RUN npm run build-only

FROM nginx:1.21-alpine
COPY --from=builder /attack_flow_builder/dist /usr/share/nginx/html

# Configure nginx to serve the app at /attack-flow/
RUN printf 'server {\n\
    listen       80;\n\
    listen  [::]:80;\n\
    server_name  localhost;\n\
\n\
    location /attack-flow/ {\n\
        alias   /usr/share/nginx/html/;\n\
        index  index.html index.htm;\n\
        try_files $uri $uri/ /attack-flow/index.html;\n\
    }\n\
\n\
    error_page   500 502 503 504  /50x.html;\n\
    location = /50x.html {\n\
        root   /usr/share/nginx/html;\n\
    }\n\
}\n' > /etc/nginx/conf.d/default.conf
