FROM oven/bun:1 AS install

WORKDIR /app

# Copy workspace configuration first
COPY package.json bun.lock ./
COPY apps/*/package.json apps/*/
COPY packages/*/package.json packages/*/

# Install dependencies (this creates the workspace structure)
RUN bun install

FROM oven/bun:1 AS build

WORKDIR /app

# Copy all source code
COPY . .

# Copy installed dependencies from previous stage
COPY --from=install /app/node_modules ./node_modules

# Ensure workspace packages are available
RUN bun install --frozen-lockfile

FROM oven/bun:1 AS run

WORKDIR /app

# Copy everything from build stage
COPY --from=build /app .

LABEL org.opencontainers.source=https://github.com/gokceno/sufle/

ENTRYPOINT ["bun"]
