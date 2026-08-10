# --- Multi-Stage Build: React bauen + nginx ausliefern ---

# Stage 1: Build
FROM node:22-alpine AS build

WORKDIR /frontend
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: nginx mit fertigem Build
FROM nginx:alpine

COPY --from=build /frontend/dist /usr/share/nginx/html
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
