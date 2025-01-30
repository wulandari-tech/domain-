# Gunakan image Node.js sebagai base image
FROM node:16-alpine AS builder

# Set working directory di dalam container
WORKDIR /app

# Salin package.json dan package-lock.json (jika ada)
COPY package*.json ./

# Install dependensi Node.js
RUN npm install

# Salin seluruh source code aplikasi
COPY . .

# Build aplikasi (jika ada, contoh: build front-end framework)
# RUN npm run build

# Gunakan image Nginx sebagai base image untuk production
FROM nginx:alpine

# Salin hasil build dari tahap builder (jika ada)
# COPY --from=builder /app/dist /usr/share/nginx/html

# Salin file statis dan server.js
COPY --from=builder /app/index.html /usr/share/nginx/html/index.html
COPY --from=builder /app/script.js /usr/share/nginx/html/script.js
COPY --from=builder /app/styles.css /usr/share/nginx/html/styles.css
COPY --from=builder /app/server.js /app/server.js

# Expose port yang digunakan oleh Nginx
EXPOSE 80

# Set entrypoint agar server.js berjalan dan kemudian Nginx
CMD ["node", "/app/server.js"]
