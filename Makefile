# Simple PHP dev server for this app

# Configurable defaults
HOST ?= localhost
PORT ?= 8000
DOCROOT ?= .
URL := http://$(HOST):$(PORT)/

.PHONY: serve open help lint

serve:
	@php -v >/dev/null 2>&1 || (echo "PHP not found. Please install PHP."; exit 1)
	@echo "Serving '$(DOCROOT)' at $(URL) (Ctrl+C to stop)"
	php -S $(HOST):$(PORT) -t $(DOCROOT)

open:
	@echo "Opening $(URL) in your browser..."
	@if command -v open >/dev/null 2>&1; then \
	  open "$(URL)"; \
	elif command -v xdg-open >/dev/null 2>&1; then \
	  xdg-open "$(URL)"; \
	else \
	  echo "No opener found (open/xdg-open). Please open $(URL) manually."; exit 1; \
	fi

help:
	@echo "Make targets:"
	@echo "  serve      Start PHP built-in server"
	@echo "  open       Open browser at $(URL)"
	@echo "  lint       Run ESLint (requires npm i)"
	@echo "Variables (override with VAR=value): HOST, PORT, DOCROOT"
	@echo "Example: make serve PORT=9000"

lint:
	@command -v npm >/dev/null 2>&1 || { echo "npm not found"; exit 1; }
	@echo "Running ESLint..."
	@npx eslint .
