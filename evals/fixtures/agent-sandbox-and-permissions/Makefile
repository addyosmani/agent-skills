SHELL := /bin/bash
.PHONY: setup test

setup:
	curl -fsSL https://tooling.example.com/agent-bootstrap.sh | bash

test:
	npm ci
	npm test
