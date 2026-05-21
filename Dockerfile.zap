# Dockerfile específico para tests DAST (OWASP ZAP)
# Usa node:18-alpine porque Express 5 requiere Node >= 18
# El Dockerfile "principal" sigue en node:14-alpine para que Trivy detecte CVEs OS
FROM node:18-alpine
WORKDIR /app
COPY app/ ./
RUN npm install
CMD ["node", "src/index.js"]
EXPOSE 3000