FROM nginx:alpine

# Copy visualization files to nginx html directory
COPY . /usr/share/nginx/html/

# Configure nginx to serve the app
RUN printf 'server {\n\
    listen       80;\n\
    listen  [::]:80;\n\
    server_name  localhost;\n\
\n\
    location / {\n\
        root   /usr/share/nginx/html;\n\
        index  index.html index.htm;\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
\n\
    # Serve JSON files with correct MIME type\n\
    location ~* \\.json$ {\n\
        root   /usr/share/nginx/html;\n\
        add_header Content-Type application/json;\n\
    }\n\
\n\
    error_page   500 502 503 504  /50x.html;\n\
    location = /50x.html {\n\
        root   /usr/share/nginx/html;\n\
    }\n\
}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

