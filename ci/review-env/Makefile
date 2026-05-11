# SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
# SPDX-License-Identifier: Apache-2.0

# Makefile - Reproducible local review environment

.PHONY: all build up down shell clean lint test

IMAGE_NAME := nemoclaw-review
IMAGE_TAG := latest
CONTAINER_NAME := nemoclaw-review-env
PORT := 8080

all: build up

build:
	docker build \
		--build-arg NODE_ENV=development \
		-t $(IMAGE_NAME):$(IMAGE_TAG) \
		-f Dockerfile \
		..

up:
	docker compose up -d

down:
	docker compose down

restart: down up

shell:
	docker exec -it $(CONTAINER_NAME) /bin/sh

logs:
	docker compose logs -f

lint:
	docker run --rm \
		-v $(CURDIR)/..:/workspace \
		-w /workspace \
		$(IMAGE_NAME):$(IMAGE_TAG) \
		npm run lint

test:
	docker run --rm \
		-v $(CURDIR)/..:/workspace \
		-w /workspace \
		$(IMAGE_NAME):$(IMAGE_TAG) \
		npm test

clean:
	docker compose down --rmi local --volumes --remove-orphans
	docker image prune -f

status:
	docker compose ps

inspect:
	docker inspect $(IMAGE_NAME):$(IMAGE_TAG)
