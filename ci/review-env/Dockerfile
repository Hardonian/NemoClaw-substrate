# SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
# SPDX-License-Identifier: Apache-2.0

FROM node:22-alpine AS base

WORKDIR /workspace

# Install system dependencies
RUN apk add --no-cache \
    bash \
    curl \
    git \
    make \
    python3 \
    py3-pip \
    shellcheck \
    shfmt

# Copy package files first for layer caching
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci --ignore-scripts || npm install

# Copy source code
COPY . .

# Build the project
RUN npm run build 2>/dev/null || true

# Expose default port
EXPOSE 8080

# Set environment
ENV NODE_ENV=development
ENV PATH="/workspace/node_modules/.bin:${PATH}"

# Default command
CMD ["sh", "-c", "echo 'NemoClaw review environment ready' && exec sh"]
