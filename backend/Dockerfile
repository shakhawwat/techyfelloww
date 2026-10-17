FROM node:22.22.3-bookworm-slim AS base
WORKDIR /app
RUN chown node:node /app

FROM base AS dependencies
COPY --chown=node:node package.json package-lock.json ./
USER node
RUN npm ci --no-audit --no-fund

FROM dependencies AS development
COPY --chown=node:node . .
ENV NODE_ENV=development PORT=4000
EXPOSE 4000
CMD ["npm", "run", "dev"]

FROM dependencies AS build
COPY --chown=node:node . .
RUN npm run build

FROM base AS production-dependencies
COPY --chown=node:node package.json package-lock.json ./
USER node
RUN npm ci --omit=dev --no-audit --no-fund

FROM base AS production
ENV NODE_ENV=production PORT=4000
COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node assets ./assets
COPY --chown=node:node package.json ./
USER node
EXPOSE 4000
CMD ["node", "dist/main.js"]
