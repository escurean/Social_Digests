FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN npm run build
RUN mkdir -p /app/public/uploads
EXPOSE 1337
ENV NODE_ENV=production
CMD ["npm", "run", "start"]
