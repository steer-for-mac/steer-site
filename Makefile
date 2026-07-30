.DEFAULT_GOAL := help
.PHONY: help build up down ci ci-quick shots dead check

help: ## Show this
	@grep -E '^[a-z][a-z-]*:.*##' $(MAKEFILE_LIST) | sed 's/:.*## /\t/' | expand -t22

build: ## Assemble index.html and home.css from parts/
	bin/build

up: ## Serve on https://steer.seanfloyd.dev.local (nginx, matches production)
	docker compose up -d && echo "https://steer.seanfloyd.dev.local"

down: ## Stop the container
	docker compose down

ci: ## Every check, in parallel
	bin/ci

ci-quick: ## Skip the rendering checks
	bin/ci --quick

shots: ## Render every band at 1440 and 375 into scratch/shots/
	bin/build && node scripts/shots.mjs

dead: ## Report CSS selectors that can never match
	node scripts/dead-css.mjs --min 0

check: build ## Build, then run every check
	bin/ci
