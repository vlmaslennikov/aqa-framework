# Virtual Data Room QA — Ubuntu/Linux host + Docker k6; requires GNU Make, bash and nvm.
# Make targets invoke Node 22.16.0 inside an nvm-enabled subprocess.
SHELL := /bin/bash
.DEFAULT_GOAL := help
ROOT := $(abspath $(dir $(lastword $(MAKEFILE_LIST))))
# Optional non-secret local k6 configuration (make variables; not an npm .env file).
-include $(ROOT)/.env.k6
-include $(ROOT)/.env.browser
NODE := $(ROOT)/scripts/with-node22.sh
BROWSER := $(ROOT)/scripts/qa-browser-exec.sh
QA_ENV := $(ROOT)/scripts/qa-env-exec.sh
API := $(ROOT)/virtual-data-room-main/apps/api
WEB := $(ROOT)/virtual-data-room-main/apps/web
QA := $(ROOT)/vdr-qa-starter
COMPOSE := $(ROOT)/virtual-data-room-main/qa/docker-compose.postgres.yml

K6_DOCKER_IMAGE ?= grafana/k6:latest
K6_EXECUTION ?= docker
K6_BASE_URL ?= http://127.0.0.1:3100
K6_LOCAL_QA_ACK ?= I_OWN_THIS_DISPOSABLE_QA_STACK
PORT ?= 3100
LHCI_CHROME_NO_SANDBOX ?= 0
export K6_DOCKER_IMAGE K6_EXECUTION K6_BASE_URL K6_LOCAL_QA_ACK K6_HEAVY_ACK K6_SCALE_LABEL QA_PERF_LARGE_ACK
export LHCI_CHROME_NO_SANDBOX

.PHONY: help install test k6-pull setup node-install node-version deps deps-api deps-web deps-qa deps-cypress env-sync \
  browser-deps k6-install k6-version env-qa env-k6 env-browser env-ui qa-discover qa-baseline qa-diff browser-path \
  playwright-install playwright-chromium playwright-ffmpeg postgres-up postgres-down db-prepare api-dev \
  test-framework test-product-unit test-known-unit qa-evidence-local qa-evidence-browser qa-evidence-all test-api test-ui test-cypress test-integration test-pdf test-requirements test-sharing test-known env-storage test-storage \
  test-all-safe test-guards web-build perf-prepare perf-seed perf-seed-medium \
  perf-seed-large perf-seed-xlarge perf-cleanup perf-smoke perf-load \
  perf-stress perf-spike perf-soak perf-volume perf-scalability perf-analyze \
  lighthouse-public lighthouse-auth lighthouse-flow lighthouse-analyze scanrepo qa-report qa-doctor qa-investigate qa-investigate-api qa-investigate-ui

help:
	@printf '\nVDR QA | Node 22.16.0 | Docker k6 on Ubuntu\n\n'
	@printf 'Bootstrap: make setup              # Node + npm deps + Chromium + FFmpeg + Cypress + k6 image\n'
	@printf '           make node-install       # nvm install 22.16.0\n'
	@printf '           make k6-install         # docker pull grafana/k6:latest\n'
	@printf '           make env-sync           # regenerate all QA env files from root .env\n'
	@printf '           make setup              # also generates UI, API, k6, browser env files\n'
	@printf 'Browser:  make playwright-install | browser-path  # auto Chrome path\n'
	@printf 'UI:       make env-ui | qa-discover | qa-baseline | qa-diff\n'
	@printf 'Database:  make postgres-up        # localhost:54329 QA PostgreSQL\n'
	@printf '           make db-prepare         # guarded Prisma generate/migrate\n'
	@printf '           make api-dev            # NestJS localhost:3100 (terminal 1)\n'
	@printf 'QA tests:  make test-product-unit | test-framework | test-integration | test-pdf | test-requirements | test-sharing\n'
	@printf '           make test-api | test-ui | test-cypress | test-all-safe\n'
	@printf 'Evidence:  make qa-evidence-local | qa-evidence-browser | qa-evidence-all | qa-report\n'
	@printf 'Config:    make qa-doctor         # safe diagnostic; never prints passwords or keys\n'
	@printf 'Storage:  make env-storage; make test-storage # local disposable Supabase only\n'
	@printf '           make test-known         # intentionally RED: 2 confirmed defects\n'
	@printf 'Perf:     make perf-seed           # 12 folders/120 files metadata\n'
	@printf '           make perf-smoke         # k6 Docker → local NestJS (terminal 2)\n'
	@printf '           make perf-load | perf-stress | perf-spike | perf-soak\n'
	@printf '           make perf-volume | perf-scalability | perf-analyze\n'
	@printf '           Heavy profiles: K6_HEAVY_ACK=I_ACCEPT_QA_LOAD make perf-stress\n'
	@printf 'Investigation: make qa-investigate | qa-investigate-api | qa-investigate-ui # finding repro, not PASS\n'
	@printf 'Other:    make lighthouse-public | lighthouse-auth | lighthouse-flow\n\n'

install: setup

test: test-all-safe

k6-pull: k6-install

setup: node-install deps playwright-install k6-install env-sync qa-doctor
	@echo '[setup] Dependencies and environment files ready. Run make test-ui or make perf-prepare.'

node-install:
	@echo "[bootstrap v0.13.0] User-mode setup; no automatic OS package installation."
	@bash "$(ROOT)/scripts/install-node22.sh"

node-version:
	@bash "$(NODE)" node --version
	@bash "$(NODE)" npm --version

deps: deps-api deps-web deps-qa deps-cypress
	@echo '[deps] API, Web, QA and Cypress installed.'

deps-api: node-install
	@bash "$(NODE)" npm --prefix "$(API)" ci --no-audit --no-fund

deps-web: node-install
	@bash "$(NODE)" npm --prefix "$(WEB)" ci --no-audit --no-fund

deps-qa: node-install
	@PUPPETEER_SKIP_DOWNLOAD=1 bash "$(NODE)" npm --prefix "$(QA)" ci --no-audit --no-fund

deps-cypress: deps-web
	@cd "$(WEB)" && bash "$(NODE)" npx --no-install cypress install
	@cd "$(WEB)" && bash "$(NODE)" npx --no-install cypress verify

browser-deps:
	@bash "$(NODE)" bash "$(ROOT)/scripts/install-browser-deps.sh"

k6-install:
	@bash "$(ROOT)/scripts/install-k6-docker.sh"

playwright-chromium: node-install deps-qa
	@cd "$(QA)" && bash "$(NODE)" npx playwright install chromium

playwright-ffmpeg: playwright-chromium node-install deps-qa
	@cd "$(QA)" && bash "$(NODE)" npx playwright install ffmpeg

playwright-install: playwright-chromium playwright-ffmpeg
	@$(MAKE) --no-print-directory browser-path

browser-path:
	@bash "$(BROWSER)" node -e 'console.log("CHROME_PATH="+process.env.CHROME_PATH); console.log("CHROMIUM_EXECUTABLE_PATH="+process.env.CHROMIUM_EXECUTABLE_PATH)'


k6-version:
	@docker run --rm "$(K6_DOCKER_IMAGE)" version

# Single source of truth: root .env. Production DB credentials are never copied into QA.
env-sync: node-install
	@bash "$(NODE)" node "$(ROOT)/scripts/sync-env.mjs"

env-browser env-ui env-qa env-k6 env-storage: env-sync
	@echo '[qa] Environment configuration synchronized from root .env.'

postgres-up:
	@docker compose -f "$(COMPOSE)" up -d --wait

postgres-down:
	@docker compose -f "$(COMPOSE)" down

db-prepare: postgres-up env-sync
	@cd "$(API)" && bash "$(QA_ENV)" bash "$(NODE)" node test/qa-db-guard.cjs
	@cd "$(API)" && bash "$(QA_ENV)" bash "$(NODE)" npx prisma generate
	@cd "$(API)" && bash "$(QA_ENV)" bash "$(NODE)" npx prisma migrate deploy

api-dev: env-sync
	@cd "$(API)" && bash "$(QA_ENV)" bash "$(NODE)" node test/qa-db-guard.cjs
	@cd "$(API)" && bash "$(QA_ENV)" bash "$(NODE)" npm run start:dev

web-build:
	@bash "$(NODE)" npm --prefix "$(WEB)" run build

qa-doctor: env-sync
	@bash "$(NODE)" node "$(ROOT)/scripts/qa-doctor.mjs"

qa-report:
	@bash "$(NODE)" node "$(ROOT)/scripts/qa-report.mjs"

test-framework:
	@bash "$(NODE)" npm --prefix "$(QA)" run test:framework

test-product-unit:
	@bash "$(NODE)" npm --prefix "$(API)" test -- --runInBand

test-known-unit:
	@bash "$(NODE)" npm --prefix "$(API)" run test:qa:known-boundaries

qa-evidence-local: env-sync
	@bash "$(NODE)" node "$(ROOT)/scripts/qa-evidence.mjs" --scope local; rc=$$?; bash "$(NODE)" node "$(ROOT)/scripts/qa-report.mjs"; exit $$rc

qa-evidence-browser: env-sync
	@bash "$(NODE)" node "$(ROOT)/scripts/qa-evidence.mjs" --scope browser; rc=$$?; bash "$(NODE)" node "$(ROOT)/scripts/qa-report.mjs"; exit $$rc

qa-evidence-all: env-sync
	@bash "$(NODE)" node "$(ROOT)/scripts/qa-evidence.mjs" --scope all; rc=$$?; bash "$(NODE)" node "$(ROOT)/scripts/qa-report.mjs"; exit $$rc

test-api: env-sync
	@cd "$(QA)" && RUN_MUTATION_TESTS=0 bash "$(NODE)" node scripts/ui-preflight.mjs
	@RUN_MUTATION_TESTS=0 bash "$(NODE)" npm --prefix "$(QA)" run test:api

qa-discover: env-sync
	@cd "$(QA)" && bash "$(NODE)" npm run qa:discover

qa-baseline: env-sync
	@cd "$(QA)" && bash "$(NODE)" npm run qa:baseline

qa-diff: env-sync
	@cd "$(QA)" && bash "$(NODE)" npm run qa:diff

test-ui: env-sync
	@cd "$(QA)" && RUN_MUTATION_TESTS=0 bash "$(NODE)" node scripts/ui-preflight.mjs
	@RUN_MUTATION_TESTS=0 bash "$(BROWSER)" npm --prefix "$(QA)" run test:ui

test-cypress:
	@cd "$(WEB)" && bash "$(BROWSER)" bash -c 'exec npx --no-install cypress run --component --config-file cypress.config.ts --browser "$$CHROMIUM_EXECUTABLE_PATH"'

test-integration: env-sync
	@cd "$(API)" && bash "$(QA_ENV)" bash "$(NODE)" npm run test:qa:integration

test-pdf: env-sync
	@cd "$(API)" && bash "$(QA_ENV)" bash "$(NODE)" npm run test:qa:pdf-lifecycle

test-requirements: env-sync
	@cd "$(API)" && bash "$(QA_ENV)" bash "$(NODE)" npm run test:qa:requirements

test-sharing: env-sync
	@cd "$(API)" && bash "$(QA_ENV)" bash "$(NODE)" npm run test:qa:sharing-matrix

test-storage: env-sync
	@cd "$(QA)" && bash "$(NODE)" node scripts/storage-e2e-run.mjs

# The three commands below are investigations, not acceptance/regression PASS suites.
# They run only against local code / fake dependencies. They do not alter SUT data.
qa-investigate:
	@bash "$(NODE)" node "$(ROOT)/scripts/independent-product-probes.cjs"

qa-investigate-api:
	@cd "$(API)" && bash "$(NODE)" npx --no-install jest --config ./test/jest-qa-independent-findings.json --runInBand

qa-investigate-ui:
	@cd "$(WEB)" && bash "$(BROWSER)" bash -c 'exec npx --no-install cypress run --component --config-file cypress.config.ts --spec "cypress/findings/delete-folder-preview.finding.cy.tsx" --config "specPattern=cypress/findings/**/*.finding.cy.tsx" --browser "$$CHROMIUM_EXECUTABLE_PATH"'

test-known: env-sync
	@echo '[qa] Expected RED until two application defects are fixed; run separately.'
	@cd "$(API)" && bash "$(QA_ENV)" bash "$(NODE)" npm run test:qa:known-defects

test-guards:
	@cd "$(API)" && bash "$(NODE)" npm run test:qa:guard
	@cd "$(API)" && bash "$(NODE)" npm run test:qa:perf:guard

test-all-safe: test-product-unit test-framework test-known-unit test-guards test-integration test-pdf test-requirements test-sharing test-cypress test-api test-ui
	@echo '[qa] Safe/default suites done. Mutation and expected-red suites were NOT run.'

perf-prepare: db-prepare
	@echo '[perf] DB ready. Start API in terminal 1: make api-dev. Seed once: make perf-seed.'

perf-seed: env-sync
	@cd "$(API)" && bash "$(QA_ENV)" bash "$(NODE)" npm run qa:perf:seed

perf-seed-medium: env-sync
	@cd "$(API)" && bash "$(QA_ENV)" bash "$(NODE)" npm run qa:perf:seed:medium

perf-seed-large: env-sync
	@cd "$(API)" && bash "$(QA_ENV)" bash "$(NODE)" npm run qa:perf:seed:large

perf-seed-xlarge: env-sync
	@cd "$(API)" && bash "$(QA_ENV)" bash "$(NODE)" npm run qa:perf:seed:xlarge

perf-cleanup: env-sync
	@cd "$(API)" && bash "$(QA_ENV)" bash "$(NODE)" npm run qa:perf:cleanup

perf-smoke perf-load perf-stress perf-spike perf-soak perf-volume perf-scalability: env-sync
	@cd "$(QA)" && set -a && source "$(ROOT)/.env.k6" && set +a && bash "$(QA_ENV)" bash "$(NODE)" node scripts/k6-run.mjs "$(@:perf-%=%)"

perf-analyze:
	@if [[ -z "$(REPORT)" ]]; then echo "Usage: make perf-analyze REPORT=reports/performance/<file>.json" >&2; exit 2; fi
	@cd "$(QA)" && bash "$(NODE)" node scripts/k6-analyze.mjs "$(REPORT)"

lighthouse-public: env-sync
	@bash "$(BROWSER)" npm --prefix "$(QA)" run lighthouse:public

lighthouse-auth: env-sync
	@bash "$(BROWSER)" npm --prefix "$(QA)" run lighthouse:auth

lighthouse-flow: env-sync
	@bash "$(BROWSER)" npm --prefix "$(QA)" run lighthouse:flow

lighthouse-analyze:
	@bash "$(NODE)" npm --prefix "$(QA)" run lighthouse:analyze

scanrepo:
	@bash "$(NODE)" npm --prefix "$(QA)" run security:repo

# Completion checks: read-only public checks and isolated mutable Storage are intentionally separate.
.PHONY: qa-final-readonly qa-final-storage
qa-final-readonly: qa-evidence-browser
	@echo '[qa] Read-only API + exploratory evidence captured. Check reports/qa-runs and test-results.'
qa-final-storage: test-storage
	@echo '[qa] Isolated Supabase E2E executed. Inspect signed-url-revocation-observation.json.'
