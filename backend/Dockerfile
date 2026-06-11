FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY src ./src
COPY db ./db
EXPOSE 3001
CMD ["sh", "-c", "node db/migrate.js && node src/index.js"]
