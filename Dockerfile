FROM node:18-alpine
WORKDIR /app
COPY app/ ./
RUN npm install
RUN npm install uuid@8.3.2
CMD ["node", "src/index.js"]
EXPOSE 3000