SITE_PORT ?= 8391

.DEFAULT_GOAL := help
.PHONY: help build build-prod up down ci ci-quick shots dead lighthouse check

help: ## Show this
	@grep -E '^[a-z][a-z-]*:.*##' $(MAKEFILE_LIST) | sed 's/:.*## /\t/' | expand -t22

build: ## Assemble the whole site into _site/ (Eleventy, then Lightning CSS)
	npx eleventy

build-prod: ## Same, with dev-only comments stripped
	ELEVENTY_ENV=production npx eleventy

# `up` builds first: nginx serves _site/, and an unbuilt tree would serve 404s
# that look like a broken config rather than a missing build.
up: build ## Serve _site/ on https://steer.seanfloyd.dev.local (nginx, matches production)
	docker compose up -d --wait && echo "https://steer.seanfloyd.dev.local  (and http://127.0.0.1:$(SITE_PORT))"

down: ## Stop the container
	docker compose down

ci: build ## Every check, against the real nginx container
	docker compose up -d --wait
	BASE_URL=http://127.0.0.1:$(SITE_PORT) bin/ci

ci-quick: ## Skip the rendering checks (no container needed)
	bin/ci --quick

shots: build ## Render every band at 1440 and 375 into scratch/shots/
	node scripts/shots.mjs

lighthouse: up ## Lighthouse gate (slow, pre-deploy rather than per-commit)
	bin/lighthouse --url http://127.0.0.1:$(SITE_PORT)/ --url http://127.0.0.1:$(SITE_PORT)/features --min 95

dead: build ## Report CSS rules no page can reach (PurgeCSS)
	bin/purge-check

check: ci ## Build, then run every check
