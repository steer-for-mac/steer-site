# Every task this repo has, defined once. package.json forwards here; nothing
# defines work twice. Make rather than npm scripts because the toolchain is
# polyglot (Python gates beside Node ones) and JSON cannot carry a reason.
#
# Needs bun, node and ruff on PATH; scripts/ci checks that and names what is
# missing. `bun x` rather than `npx` is a launcher swap and nothing more: it
# resolves out of node_modules/.bin and honours each bin's `#!/usr/bin/env
# node`, so every gate below still RUNS under Node and the artifact is
# unchanged. It buys 0.11s of startup against npx's 0.44s, seven times a
# `make ci` (counted with a PATH shim). Bun is the runtime for one file,
# scripts/serve.js. npm still installs: dependencies.yml reads package-lock.json.

SITE_PORT ?= 8391

.DEFAULT_GOAL := help
.PHONY: help build up down ci ci-quick lint-css lint-html lint-js lint-py a11y contrast types e2e shots dead lighthouse check

help: ## Show this
	@grep -E '^[a-z0-9][a-z0-9-]*:.*##' $(MAKEFILE_LIST) | sed 's/:.*## /\t/' | expand -t22

build: ## Assemble the whole site into dist/ (Eleventy, then Lightning CSS)
	bun x eleventy

up: build ## Serve dist/ on https://steer.seanfloyd.dev.local (nginx, matches production)
	docker compose up -d --wait && echo "https://steer.seanfloyd.dev.local  (and http://127.0.0.1:$(SITE_PORT))"

down: ## Stop the container
	docker compose down

ci: build ## Every check
	scripts/ci

ci-quick: ## Skip the rendering checks (no container needed)
	scripts/ci --quick

# Sources only. Lightning CSS compresses colours in dist/, so linting the
# output flags values nobody wrote.
lint-css: ## stylelint every hand-written sheet
	bun x stylelint 'src/styles/*.css' 'src/styles/bands/*.css' 'src/styles/pages/*.css'

# No build prerequisite anywhere below: scripts/ci and the deploy workflow build
# once, then run these against that one artifact, several at a time.
lint-html: ## html-validate every page in dist/
	bun x html-validate 'dist/**/*.html'

lint-js: ## eslint every script and spec
	bun x eslint .

# By shebang, not extension: four of the five gates have no .py, so `ruff check
# scripts/` reads one of them and reports "All checks passed" for the rest.
lint-py: ## ruff over every Python gate (found by shebang, not a hand-kept list)
	ruff check $$(grep -lE '^.!.*python' scripts/*)

# axe-core, not Lighthouse: that category IS axe-core plus a page load, at
# 2m15s against 7s. A two-minute per-commit step stops being run.
a11y: build ## axe-core (WCAG 2 A/AA) over every page in dist/, both themes
	bun x playwright test tests/a11y.spec.js

contrast: ## Every token colour pair clears AA on the darkest surface it can land on
	node scripts/contrast.js

types: ## tsc --noEmit over every script and gate
	bun x tsc

# The only gate that presses a button; everything else grades a page holding
# still. That is how a one-way theme toggle shipped on 14 pages, all green.
e2e: build ## Playwright: drive the theme toggle and the controller picker
	bun x playwright test

shots: build ## Render every section at 1440 and 375 into scratch/shots/
	bun x playwright test -c playwright.tools.config.js

lighthouse: up ## Lighthouse gate (slow, pre-deploy rather than per-commit)
	scripts/lighthouse --url http://127.0.0.1:$(SITE_PORT)/ --url http://127.0.0.1:$(SITE_PORT)/features --min 95

dead: build ## Report CSS rules no page can reach (PurgeCSS)
	scripts/purge-check

check: ci ## Build, then run every check
