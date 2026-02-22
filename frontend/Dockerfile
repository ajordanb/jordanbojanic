FROM node:22-alpine AS builder
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build


FROM socialengine/nginx-spa:latest AS runner
COPY --from=builder /usr/src/app/dist /app
EXPOSE 80
CMD ["nginx"]
