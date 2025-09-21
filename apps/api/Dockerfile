FROM oven/bun:1 AS install

WORKDIR /app

# Copy workspace configuration and source files
COPY package.json bun.lock ./
COPY apps/ apps/
COPY packages/ packages/

# Install dependencies (this creates the workspace structure)
RUN bun install

FROM oven/bun:1 AS build

WORKDIR /app

# Copy any remaining files not already copied
COPY . .

# Copy installed dependencies from previous stage
COPY --from=install /app/node_modules ./node_modules

# Ensure workspace packages are available (should be a no-op now)
RUN bun install --frozen-lockfile

FROM oven/bun:1 AS run

WORKDIR /app

# Copy everything from build stage
COPY --from=build /app .

LABEL org.opencontainers.source=https://github.com/gokceno/sufle/

ENTRYPOINT ["bun"]
