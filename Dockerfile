# HeroPath — app + worker share this image
FROM node:20-bookworm-slim

# openssl is required by Prisma; build tools are needed to compile bcrypt
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies (full, incl. tsx used by the worker)
COPY package.json package-lock.json ./
RUN npm ci

# Build
COPY . .
RUN npx prisma generate && npm run build

ENV NODE_ENV=production
EXPOSE 3000

# Default command (overridden by the worker service in compose)
CMD ["npm", "run", "start"]
