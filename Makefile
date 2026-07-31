# Every task this repo has, defined once. package.json forwards here; nothing
# defines work twice. Make rather than npm scripts because the toolchain is
# polyglot (Python gates beside Node ones) and JSON cannot carry a reason.

SITE_PORT ?= 8391

.DEFAULT_GOAL := help
.PHONY: help build build-prod up down ci ci-quick lint-css lint-html lint-js lint-py a11y contrast types e2e shots dead lighthouse check

help: ## Show this
	@grep -E '^[a-z0-9][a-z0-9-]*:.*##' $(MAKEFILE_LIST) | sed 's/:.*## /\t/' | expand -t22

build: ## Assemble the whole site into _site/ (Eleventy, then Lightning CSS)
	npx eleventy

build-prod: ## Same, with dev-only comments stripped
	ELEVENTY_ENV=production npx eleventy

up: build ## Serve _site/ on https://steer.seanfloyd.dev.local (nginx, matches production)
	docker compose up -d --wait && echo "https://steer.seanfloyd.dev.local  (and http://127.0.0.1:$(SITE_PORT))"

down: ## Stop the container
	docker compose down

ci: build ## Every check, against the real nginx container
	docker compose up -d --wait
	BASE_URL=http://127.0.0.1:$(SITE_PORT) scripts/ci

ci-quick: ## Skip the rendering checks (no container needed)
	scripts/ci --quick

# Sources only. Lightning CSS compresses colours in _site/, so linting the
# output flags values nobody wrote.
lint-css: ## stylelint every hand-written sheet
	npx stylelint 'styles/*.css' 'styles/bands/*.css' 'styles/pages/*.css'

# No build prerequisite anywhere below: scripts/ci and the deploy workflow build
# once, then run these against that one artifact, several at a time.
lint-html: ## html-validate every page in _site/
	npx html-validate '_site/**/*.html'

lint-js: ## eslint home.js and every .mjs tool
	npx eslint .

# By shebang, not extension: four of the five gates have no .py, so `ruff check
# scripts/` reads one of them and reports "All checks passed" for the rest.
lint-py: ## ruff over every Python gate (found by shebang, not a hand-kept list)
	ruff check $$(grep -lE '^.!.*python' scripts/*)

# axe-core, not Lighthouse: that category IS axe-core plus a page load, at
# 2m15s against 7s. A two-minute per-commit step stops being run.
a11y: ## axe-core (WCAG 2 A/AA) over every page in _site/
	node scripts/axe-check.mjs

contrast: ## Every token colour pair clears AA on the darkest surface it can land on
	node scripts/contrast.mjs

types: ## tsc --noEmit over every script and gate
	npx tsc

# The only gate that presses a button; everything else grades a page holding
# still. That is how a one-way theme toggle shipped on 14 pages, all green.
e2e: build ## Playwright: drive the theme toggle and the controller picker
	npx playwright test

shots: build ## Render every band at 1440 and 375 into scratch/shots/
	node scripts/shots.mjs

lighthouse: up ## Lighthouse gate (slow, pre-deploy rather than per-commit)
	scripts/lighthouse --url http://127.0.0.1:$(SITE_PORT)/ --url http://127.0.0.1:$(SITE_PORT)/features --min 95

dead: build ## Report CSS rules no page can reach (PurgeCSS)
	scripts/purge-check

check: ci ## Build, then run every check
