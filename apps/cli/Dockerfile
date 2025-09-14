FROM python:slim-bullseye AS base

RUN apt-get update && apt-get install -y \
    curl \
    unzip \
    build-essential \
    python3 \
    pkg-config \
    libvips-dev \
    && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://bun.sh/install | bash && \
    ln -s $HOME/.bun/bin/bun /usr/local/bin/bun

RUN pip install --no-cache-dir markitdown[all] && \
    ln -s /usr/local/bin/markitdown /usr/bin/markitdown

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

FROM base AS run

WORKDIR /app

# Copy everything from build stage including the Bun runtime and dependencies
COPY --from=build /app .

LABEL org.opencontainers.source=https://github.com/gokceno/sufle/

ENTRYPOINT ["bun"]
