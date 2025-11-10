.PHONY: help install dev-install clean test lint format run run-dev run-prod migrate db-up db-down docs build docker-build docker-up docker-down

# Colors for output
BLUE := \033[0;34m
GREEN := \033[0;32m
RED := \033[0;31m
YELLOW := \033[0;33m
NC := \033[0m # No Color

# Project variables
PYTHON := .venv/bin/python3
UV := uv
APP_MODULE := app.main:app
PORT := 8000

help: ## Show this help message
	@echo "$(BLUE)RoadDogs Game Server - Available Commands$(NC)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-20s$(NC) %s\n", $$1, $$2}'
	@echo ""

# ==================== Setup ====================

install: ## Install production dependencies
	@echo "$(BLUE)Installing production dependencies...$(NC)"
	$(UV) venv --python 3.12
	$(UV) pip install -e .
	$(UV) pip install -e src/ctx-timer/
	@echo "$(GREEN)✓ Production dependencies installed$(NC)"

dev-install: install ## Install development dependencies
	@echo "$(BLUE)Installing development dependencies...$(NC)"
	$(UV) pip install -e ".[dev]"
	@echo "$(GREEN)✓ Development dependencies installed$(NC)"

clean: ## Clean build artifacts and cache
	@echo "$(BLUE)Cleaning build artifacts...$(NC)"
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete
	find . -type f -name "*.pyo" -delete
	find . -type f -name "*.egg-info" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".ruff_cache" -exec rm -rf {} + 2>/dev/null || true
	rm -rf build/ dist/ *.egg-info htmlcov/ .coverage
	@echo "$(GREEN)✓ Cleaned$(NC)"

# ==================== Development ====================

run: ## Run FastAPI server (development mode)
	@echo "$(BLUE)Starting FastAPI server on http://localhost:$(PORT)$(NC)"
	@echo "$(YELLOW)Docs: http://localhost:$(PORT)/docs$(NC)"
	$(UV) run uvicorn $(APP_MODULE) --reload --host 0.0.0.0 --port $(PORT) --log-level info

run-dev: run ## Alias for run

run-prod: ## Run FastAPI server (production mode)
	@echo "$(BLUE)Starting FastAPI server (production)...$(NC)"
	$(UV) run uvicorn $(APP_MODULE) --host 0.0.0.0 --port $(PORT) --workers 4 --log-level warning

run-legacy-game: ## Run legacy Tornado game server
	@echo "$(YELLOW)Starting legacy Tornado game server...$(NC)"
	$(PYTHON) sublayers_server/engine_server.py --mode=basic --port=8000

run-legacy-site: ## Run legacy Tornado site server
	@echo "$(YELLOW)Starting legacy Tornado site server...$(NC)"
	$(PYTHON) sublayers_site/site_server.py --port=8001

# ==================== Database ====================

db-up: ## Start MongoDB with Docker
	@echo "$(BLUE)Starting MongoDB...$(NC)"
	docker run -d --name roaddogs-mongo \
		-p 27017:27017 \
		-v roaddogs-mongo-data:/data/db \
		-e MONGO_INITDB_DATABASE=rd \
		mongo:7
	@echo "$(GREEN)✓ MongoDB running on mongodb://localhost:27017/rd$(NC)"

db-down: ## Stop MongoDB
	@echo "$(BLUE)Stopping MongoDB...$(NC)"
	docker stop roaddogs-mongo
	docker rm roaddogs-mongo
	@echo "$(GREEN)✓ MongoDB stopped$(NC)"

db-shell: ## Open MongoDB shell
	@echo "$(BLUE)Opening MongoDB shell...$(NC)"
	docker exec -it roaddogs-mongo mongosh rd

# ==================== Testing ====================

test: ## Run tests
	@echo "$(BLUE)Running tests...$(NC)"
	$(UV) run pytest -v

test-cov: ## Run tests with coverage
	@echo "$(BLUE)Running tests with coverage...$(NC)"
	$(UV) run pytest -v --cov=app --cov-report=html --cov-report=term

test-watch: ## Run tests in watch mode
	@echo "$(BLUE)Running tests in watch mode...$(NC)"
	$(UV) run pytest-watch

# ==================== Code Quality ====================

lint: ## Run linter (ruff)
	@echo "$(BLUE)Running linter...$(NC)"
	$(UV) run ruff check app/ sublayers_server/ sublayers_site/ sublayers_common/

lint-fix: ## Run linter with auto-fix
	@echo "$(BLUE)Running linter with auto-fix...$(NC)"
	$(UV) run ruff check --fix app/ sublayers_server/ sublayers_site/ sublayers_common/

format: ## Format code with ruff
	@echo "$(BLUE)Formatting code...$(NC)"
	$(UV) run ruff format app/ sublayers_server/ sublayers_site/ sublayers_common/

format-check: ## Check code formatting
	@echo "$(BLUE)Checking code formatting...$(NC)"
	$(UV) run ruff format --check app/ sublayers_server/ sublayers_site/ sublayers_common/

type-check: ## Run type checking
	@echo "$(BLUE)Running type checks...$(NC)"
	$(UV) run mypy app/ --ignore-missing-imports

check: lint format-check type-check ## Run all checks

# ==================== Documentation ====================

docs: ## Open API documentation
	@echo "$(BLUE)Opening API documentation...$(NC)"
	@echo "Swagger UI: http://localhost:$(PORT)/docs"
	@echo "ReDoc: http://localhost:$(PORT)/redoc"
	@open http://localhost:$(PORT)/docs 2>/dev/null || xdg-open http://localhost:$(PORT)/docs 2>/dev/null || echo "Please open http://localhost:$(PORT)/docs manually"

docs-build: ## Build API documentation
	@echo "$(BLUE)Building documentation...$(NC)"
	$(UV) run python -c "from app.main import app; import json; print(json.dumps(app.openapi(), indent=2))" > openapi.json
	@echo "$(GREEN)✓ OpenAPI schema saved to openapi.json$(NC)"

# ==================== Migration ====================

migrate-check: ## Check which handlers need migration
	@echo "$(BLUE)Checking migration status...$(NC)"
	@echo "$(YELLOW)Tornado handlers:$(NC)"
	@find sublayers_server/handlers -name "*.py" -type f | wc -l
	@echo "$(GREEN)FastAPI routers:$(NC)"
	@find app/routers -name "*.py" -type f | wc -l
	@echo ""
	@echo "$(YELLOW)Checking for deprecated patterns:$(NC)"
	@grep -r "@gen.coroutine\|yield\|tornado.gen" sublayers_server/model/*.py 2>/dev/null | wc -l | xargs echo "  gen.coroutine patterns:"
	@grep -r "mongoengine.Document" sublayers_server/model/ 2>/dev/null | wc -l | xargs echo "  MongoEngine documents:"

mark-deprecated: ## Mark legacy Tornado code as deprecated
	@echo "$(BLUE)Marking legacy code as deprecated...$(NC)"
	@echo "This would add @deprecated decorators to Tornado handlers"
	@echo "$(YELLOW)Manual review recommended before running$(NC)"

# ==================== Docker ====================

docker-build: ## Build Docker image
	@echo "$(BLUE)Building Docker image...$(NC)"
	docker build -t roaddogs:latest -f Dockerfile .
	@echo "$(GREEN)✓ Docker image built$(NC)"

docker-up: ## Start application with Docker Compose
	@echo "$(BLUE)Starting application with Docker Compose...$(NC)"
	docker-compose up -d
	@echo "$(GREEN)✓ Application running$(NC)"
	@echo "API: http://localhost:$(PORT)"
	@echo "Docs: http://localhost:$(PORT)/docs"

docker-down: ## Stop Docker Compose
	@echo "$(BLUE)Stopping Docker Compose...$(NC)"
	docker-compose down
	@echo "$(GREEN)✓ Stopped$(NC)"

docker-logs: ## View Docker logs
	docker-compose logs -f

# ==================== Utilities ====================

shell: ## Open Python shell with app context
	@echo "$(BLUE)Opening Python shell...$(NC)"
	$(PYTHON) -i -c "from app.main import app; from app.database import Database; from app.config import get_settings; print('App context loaded. Available: app, Database, get_settings')"

migrate-py3: ## Run Python 3 migration script
	@echo "$(BLUE)Running Python 3 migration script...$(NC)"
	$(PYTHON) migrate_py3.py
	@echo "$(GREEN)✓ Migration complete$(NC)"

stats: ## Show project statistics
	@echo "$(BLUE)Project Statistics$(NC)"
	@echo ""
	@echo "Python files:"
	@find . -name "*.py" -not -path "./.venv/*" -not -path "./build/*" | wc -l
	@echo ""
	@echo "Lines of code:"
	@find . -name "*.py" -not -path "./.venv/*" -not -path "./build/*" -exec wc -l {} + | tail -1
	@echo ""
	@echo "FastAPI routes:"
	@find app/routers -name "*.py" 2>/dev/null | wc -l
	@echo ""
	@echo "Tornado handlers:"
	@find sublayers_server/handlers -name "*.py" 2>/dev/null | wc -l
	@echo ""
	@echo "Beanie models:"
	@find app/models -name "*.py" -not -name "__init__.py" 2>/dev/null | wc -l
	@echo ""
	@echo "MongoEngine models:"
	@grep -r "class.*Document" sublayers_server/model/ sublayers_site/ 2>/dev/null | wc -l

# ==================== Git ====================

commit-migration: ## Commit migration progress
	@echo "$(BLUE)Committing migration progress...$(NC)"
	git add -A
	@read -p "Commit message: " msg; \
	git commit -m "feat: $$msg"
	@echo "$(GREEN)✓ Changes committed$(NC)"

# ==================== Default ====================

.DEFAULT_GOAL := help
