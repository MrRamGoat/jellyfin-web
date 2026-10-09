FROM node:24-alpine AS build
WORKDIR /source
COPY package.json package-lock.json .npmrc ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build:check && npm run build:production

FROM nginx:1.27-alpine
COPY deployment/ramflix/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /source/dist /srv/client/web
EXPOSE 80
