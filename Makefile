# Every task this repo has, defined once, here.
#
# Tasks used to be spread across this file, package.json scripts and bin/ci, so
# "how do I lint the CSS" had three answers that could drift apart, and one of
# them (the stylelint glob) already existed in three copies. The Makefile is the
# single definition point, for three reasons:
#
#   1. package.json scripts cannot carry comments. It is JSON. Every config file
#      in this repo explains itself at the point the decision is made; a
#      "ci": "..." string field cannot, and the reasoning would have to move to a
#      doc, where it goes stale. That alone decides it.
#   2. The toolchain is polyglot: four Python gates and five Node tools. npm
#      scripts shelling out to Python is a Node frame wrapped around something
#      that is not Node. Make is the neutral driver and does not care.
#   3. `make help` already exists and is what CLAUDE.md documents. Self-
#      documenting targets via `## comment` beat what `npm run` prints.
#
# package.json keeps two scripts and both forward here. Nothing defines work
# twice.

SITE_PORT ?= 8391

.DEFAULT_GOAL := help
.PHONY: help build build-prod up down ci ci-quick lint-css lint-html shots dead lighthouse check

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
	BASE_URL=http://127.0.0.1:$(SITE_PORT) scripts/ci

ci-quick: ## Skip the rendering checks (no container needed)
	scripts/ci --quick

# Globbed, not a file list: a hand-maintained list means the next sheet somebody
# adds is unlinted until they remember to edit this file, and the sheets are
# split per band precisely so new ones keep appearing. Two globs because
# `styles/*.css` does not descend into styles/bands/. Sources only, never the
# generated sheets in _site/: Lightning CSS compresses colours there and the
# output flags values nobody wrote. scripts/ci and the deploy workflow both call
# this target rather than repeating the globs.
lint-css: ## stylelint every hand-written sheet
	npx stylelint 'styles/*.css' 'styles/bands/*.css' 'styles/pages/*.css'

# The BUILT site, not the templates. html-validate used to read the band
# fragments against a config that switched eight rules off because a fragment is
# not a document (close-order, element-required-content, heading-level,
# unique-landmark, no-implicit-close and three stylistic ones); the fragments
# became Nunjucks in the Eleventy migration and the step was dropped rather than
# repointed. Every one of those eight is back on, because _site/ holds complete
# documents. No build prerequisite, for the same reason lint-css has none:
# scripts/ci and the deploy workflow build once and then run every gate against
# that one artifact, several of them at the same time.
lint-html: ## html-validate every page in _site/
	npx html-validate '_site/**/*.html'

shots: build ## Render every band at 1440 and 375 into scratch/shots/
	node scripts/shots.mjs

lighthouse: up ## Lighthouse gate (slow, pre-deploy rather than per-commit)
	scripts/lighthouse --url http://127.0.0.1:$(SITE_PORT)/ --url http://127.0.0.1:$(SITE_PORT)/features --min 95

dead: build ## Report CSS rules no page can reach (PurgeCSS)
	scripts/purge-check

check: ci ## Build, then run every check
