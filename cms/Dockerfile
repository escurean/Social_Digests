FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN npm run build
EXPOSE 1337
ENV NODE_ENV=production
CMD ["npm", "run", "start"]
