SITE_PORT ?= 8391

.DEFAULT_GOAL := help
.PHONY: help build up down ci ci-quick shots dead lighthouse check

help: ## Show this
	@grep -E '^[a-z][a-z-]*:.*##' $(MAKEFILE_LIST) | sed 's/:.*## /\t/' | expand -t22

build: ## Assemble index.html and home.css from parts/
	bin/build

up: ## Serve on https://steer.seanfloyd.dev.local (nginx, matches production)
	docker compose up -d --wait && echo "https://steer.seanfloyd.dev.local  (and http://127.0.0.1:$(SITE_PORT))"

down: ## Stop the container
	docker compose down

ci: ## Every check, against the real nginx container
	docker compose up -d --wait
	BASE_URL=http://127.0.0.1:$(SITE_PORT) bin/ci

ci-quick: ## Skip the rendering checks (no container needed)
	bin/ci --quick

shots: ## Render every band at 1440 and 375 into scratch/shots/
	bin/build && node scripts/shots.mjs

lighthouse: ## Lighthouse gate (slow, pre-deploy rather than per-commit)
	docker compose up -d --wait
	bin/lighthouse --url http://127.0.0.1:$(SITE_PORT)/ --url http://127.0.0.1:$(SITE_PORT)/features --min 95

dead: ## Report CSS selectors that can never match
	node scripts/dead-css.mjs --min 0

check: build ## Build, then run every check
	bin/ci
