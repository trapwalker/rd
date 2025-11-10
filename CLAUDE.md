# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RoadDogs is a multi-player online game built with Python (Tornado web framework), MongoDB, and an Electron-based client. The game features a post-apocalyptic RPG world with vehicles, quests, inventory systems, and real-time multiplayer interactions via WebSockets.

## Architecture

The codebase is structured as a monorepo with multiple server components:

### Core Components

- **sublayers_server/** - Main game server handling game logic, event machine, agents, and WebSocket connections
- **sublayers_site/** - Website/portal server for user authentication, profiles, ratings, and news
- **sublayers_editor/** - Level/world editor server with WebSocket-based editing interface
- **sublayers_world/** - Game world data including registry of items, quests, zones, NPCs, and map tiles
- **sublayers_common/** - Shared code including handlers, static assets, localization, and utilities
- **sublayers_admin/** - Administrative tools
- **electron_client/** - Desktop client built with Electron, includes Steam integration
- **cli/** - Command-line interface tools for managing agents, registry, backups, and updates

### Key Architecture Concepts

**Event Machine**: The core game loop is managed by the `Server` class in `sublayers_server/model/event_machine.py`. It handles:
- Timeline-based event scheduling
- Agent management (players and NPCs)
- Message queue processing
- World state persistence
- Visibility management between agents

**Registry System**: World content is defined in YAML files under `sublayers_world/registry/` and loaded via `sublayers_server/model/registry_me/`. Categories include:
- `items/` - Weapons, armor, consumables, vehicle parts
- `quests/` - Quest definitions and states
- `agents/` - NPC definitions
- `zones/` - Map zones and boundaries
- `institutions/` - Towns, gas stations, points of interest
- `world_settings/` - Game configuration

**Agent System**: All active entities (players and NPCs) are managed as "agents" with AI dispatchers for bot behavior (`sublayers_server/model/agents.py`, `sublayers_server/model/ai_dispatcher.py`).

**Two Server Modes**:
- `basic` - Full game mode with complete world and persistence
- `quick` - Fast-paced mode with limited map, quick respawns, and shortened loot lifetime

## Development Commands

### Server Startup

```bash
# Install dependencies
pip install -r requirements.txt

# Start MongoDB
mongod

# Start game server (basic mode)
python sublayers_server/engine_server.py --mode=basic --port=8000

# Start game server (quick mode)
python sublayers_server/engine_server_quick.py --mode=quick --port=8005

# Start site/portal server
python sublayers_site/site_server.py --port=8001

# Start editor server
python sublayers_editor/server.py --port=80
```

### Electron Client

```bash
cd electron_client

# Install dependencies
npm install

# Run in development mode
npm start

# Run with Steam integration
npm run start-steam

# Build for platforms
npm run build-win-64
npm run build-ubuntu
npm run build-mac

# Rebuild native modules (like greenworks for Steam)
npm run rebuild_greenworks
```

### CLI Tools

The CLI tool is accessible via the package name (based on directory name):

```bash
# General usage
python -m cli [command] [options]

# Database connection
python -m cli --db rd [command]

# Common commands (see cli/*.py for implementations)
python -m cli agents     # Agent management
python -m cli reg        # Registry operations
python -m cli backup     # Backup utilities
python -m cli update     # Update operations
python -m cli control    # Server control
```

### Configuration

Servers use configuration files with local overrides:
- `sublayers_server/server.conf` + `local.server.conf`
- `sublayers_site/site_server.conf` + `local.site_server.conf`
- `sublayers_editor/server.conf` + `server.local.conf`

Configuration is loaded via `settings.py` in each module using Tornado options.

## Technology Stack

- **Backend**: Python 2.7/3.x, Tornado (async web framework)
- **Database**: MongoDB with MongoEngine ODM
- **WebSockets**: Tornado WebSocket handlers for real-time communication
- **Client**: Electron + jQuery
- **Dependencies**: See `requirements.txt` and `setup.py`
  - `tornado` - Web framework
  - `mongoengine` - MongoDB ODM
  - `PyYAML` - Registry data parsing
  - `pillow` - Image processing for tiles
  - `click` - CLI framework
  - `ctx_timer` - Custom timing utility

## Code Structure Notes

### Handler Organization

- Game API handlers in `sublayers_server/handlers/` (inventory, character, party, journal, etc.)
- Site handlers in `sublayers_site/handlers/` (auth, user info, ratings)
- Common handlers in `sublayers_common/handlers/` (base classes, locale)

### Model Layer

Core game logic in `sublayers_server/model/`:
- `agents.py` - Player and NPC agent implementations
- `inventory.py` - Inventory and container systems
- `barter.py` - Trading system
- `chat_room.py` - Chat functionality
- `map_location.py` - POIs, towns, gas stations
- `messages.py` - Message system for agent communication
- `events.py` - Event definitions
- `api_tools.py` - API helper utilities

### WebSocket Communication

Agent connections handled via:
- `sublayers_server/handlers/client_connector.py::AgentSocketHandler`
- `sublayers_editor/client_connector.py::ClientSocketHandler`

### Static Assets

Shared static files in `sublayers_common/static/`:
- Game content in `content/` (items, vehicles, weapons with metadata and images)
- Localization files in `locale/game/` and `locale/site/`
- Static site resources

## Version Control

The project uses Git (converted from Mercurial - note `.hgignore` and `hgapi` usage in CLI).
- Main branch: `master`
- Current branch: `2to3` (Python 2 to 3 migration in progress)

## Python 2 to 3 Migration

The codebase is undergoing migration from Python 2 to Python 3. Watch for:
- `from __future__ import` statements
- `unicode` type usage (Python 2)
- `.decode('cp1251')` for Windows encoding
- Print statements vs print functions
