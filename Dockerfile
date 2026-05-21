# MODIFICACIÓN INTENCIONAL — test escaneo de contenedores (Trivy)
# node:14-alpine tiene CVEs conocidos en la capa OS
# Se ejecuta como root (sin USER) — DS002
# Se expone información de versión — DS026
FROM node:14-alpine
WORKDIR /app
COPY app/ ./
RUN npm install
RUN npm install uuid@8.3.2 lodash@4.17.20
CMD ["node", "src/index.js"]
EXPOSE 3000