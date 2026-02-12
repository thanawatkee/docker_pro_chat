FROM nginx:alpine

# Copy HTML and JS files
COPY index.html /usr/share/nginx/html/
COPY app.js /usr/share/nginx/html/

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
