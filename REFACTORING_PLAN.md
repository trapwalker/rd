# FastAPI Modernization & Refactoring Plan

## Overview
Migrate from Tornado to FastAPI with full async/await support and modern Python 3.12 features.

## Phase 1: Analysis & Preparation

### Current Architecture
- **Web Framework**: Tornado 6.5.2 (callback-based async)
- **Database**: MongoEngine 0.29.1 (sync ORM)
- **WebSocket**: Tornado WebSocket handlers
- **Handlers**: ~37 Tornado RequestHandler classes
- **Async Patterns**: Mixed gen.coroutine/callback style

### Target Architecture
- **Web Framework**: FastAPI 0.115+ (async/await native)
- **Database**: Motor 3.6+ (async MongoDB driver) + Beanie 1.27+ (async ODM)
- **WebSocket**: FastAPI WebSocket support
- **Handlers**: FastAPI route functions with dependency injection
- **Async Patterns**: Pure async/await with asyncio

## Phase 2: Dependencies Update

### New Dependencies
```toml
fastapi = ">=0.115.0"
uvicorn = {extras = ["standard"], version = ">=0.32.0"}
motor = ">=3.6.0"
beanie = ">=1.27.0"
pydantic = ">=2.10.0"
python-multipart = ">=0.0.16"  # for form data
python-jose = {extras = ["cryptography"], version = ">=3.3.0"}  # for JWT
passlib = {extras = ["bcrypt"], version = ">=1.7.4"}  # for passwords
aiofiles = ">=24.0.0"  # async file operations
websockets = ">=14.0"
```

### Remove/Replace
- Remove: tornado
- Replace: mongoengine → beanie + motor
- Keep: pymongo (for low-level ops if needed)

## Phase 3: Migration Strategy

### 3.1 Database Layer Migration

**Current**: MongoEngine Documents (sync)
```python
class User(Document):
    email = StringField(required=True)
    name = StringField()
```

**Target**: Beanie Documents (async)
```python
from beanie import Document
from pydantic import Field

class User(Document):
    email: str = Field(index=True)
    name: str | None = None

    class Settings:
        name = "users"
```

### 3.2 Handler Migration

**Current**: Tornado Handlers
```python
class MyHandler(BaseHandler):
    def get(self):
        self.write({"data": "value"})

    @gen.coroutine
    def post(self):
        data = yield some_async_call()
        self.write(data)
```

**Target**: FastAPI Routes
```python
from fastapi import APIRouter, Depends

router = APIRouter()

@router.get("/endpoint")
async def get_endpoint():
    return {"data": "value"}

@router.post("/endpoint")
async def post_endpoint(data: DataModel):
    result = await some_async_call()
    return result
```

### 3.3 WebSocket Migration

**Current**: Tornado WebSocket
```python
class WSHandler(tornado.websocket.WebSocketHandler):
    def open(self):
        self.write_message("connected")

    def on_message(self, message):
        self.write_message("echo: " + message)
```

**Target**: FastAPI WebSocket
```python
from fastapi import WebSocket

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    await websocket.send_text("connected")

    async for message in websocket.iter_text():
        await websocket.send_text(f"echo: {message}")
```

### 3.4 Async Pattern Refactoring

**Current**: Callbacks & gen.coroutine
```python
@gen.coroutine
def my_function():
    result = yield async_operation()
    callback_func(result)
    raise gen.Return(result)
```

**Target**: async/await
```python
async def my_function():
    result = await async_operation()
    return result
```

## Phase 4: Implementation Order

### Step 1: New Core Infrastructure
1. Create new FastAPI application structure
2. Setup Beanie/Motor database connection
3. Create Pydantic models for API schemas
4. Setup dependency injection system

### Step 2: Migrate Database Models
1. Convert MongoEngine Documents to Beanie Documents
2. Update all database queries to async
3. Create migration utilities for data if needed

### Step 3: Migrate Handlers (Priority Order)
1. **Authentication handlers** (login, logout, OAuth)
2. **API endpoints** (game API, user info, stats)
3. **WebSocket handler** (game connection)
4. **Static handlers** (if needed, FastAPI can serve static)
5. **Admin handlers**

### Step 4: Refactor Business Logic
1. Convert callback-based code to async/await
2. Replace tornado.gen with asyncio
3. Use modern Python 3.12 features:
   - Type hints with | syntax (str | None)
   - Pattern matching (match/case)
   - Dataclasses with slots
   - Structural pattern matching

### Step 5: Modernize Code Patterns

#### Use Type Hints Everywhere
```python
def process_user(user_id: int) -> User | None:
    ...
```

#### Use Dataclasses
```python
from dataclasses import dataclass, field

@dataclass(slots=True)
class GameState:
    position: tuple[float, float]
    velocity: tuple[float, float] = (0.0, 0.0)
    items: list[str] = field(default_factory=list)
```

#### Use Pattern Matching
```python
match message_type:
    case "move":
        await handle_move(data)
    case "attack":
        await handle_attack(data)
    case _:
        logger.warning(f"Unknown message type: {message_type}")
```

#### Use Async Context Managers
```python
async with motor_client.start_session() as session:
    async with session.start_transaction():
        await collection.insert_one(doc)
```

## Phase 5: Testing & Validation

### Unit Tests
- pytest-asyncio for async tests
- httpx for FastAPI testing

### Integration Tests
- Test WebSocket connections
- Test database operations
- Test authentication flow

## Phase 6: Deprecation Tagging

Mark unused code with:
```python
import warnings
from typing import deprecated

@deprecated("This function is no longer used. Use new_function() instead.")
def old_function():
    warnings.warn(
        "old_function is deprecated, use new_function",
        DeprecationWarning,
        stacklevel=2
    )
    ...
```

Or with custom decorator:
```python
def unused(reason: str):
    """Mark function/class as unused."""
    def decorator(func):
        func.__unused__ = True
        func.__unused_reason__ = reason
        return func
    return decorator

@unused("Replaced by FastAPI route handler")
class OldTornadoHandler:
    ...
```

## Phase 7: Performance Optimizations

### Connection Pooling
```python
from motor.motor_asyncio import AsyncIOMotorClient

client = AsyncIOMotorClient(
    uri,
    maxPoolSize=50,
    minPoolSize=10,
    maxIdleTimeMS=45000
)
```

### Caching
```python
from functools import lru_cache
from cachetools import TTLCache

# Sync cache
@lru_cache(maxsize=128)
def expensive_computation(x: int) -> int:
    ...

# Async cache with TTL
cache = TTLCache(maxsize=100, ttl=300)
```

### Background Tasks
```python
from fastapi import BackgroundTasks

@router.post("/process")
async def process_data(background_tasks: BackgroundTasks):
    background_tasks.add_task(long_running_task, param1, param2)
    return {"status": "processing"}
```

## Phase 8: Documentation

### Auto-generated API Docs
FastAPI provides:
- Interactive docs at `/docs` (Swagger UI)
- Alternative docs at `/redoc` (ReDoc)
- OpenAPI schema at `/openapi.json`

### Update CLAUDE.md
Document new architecture, commands, and patterns.

## Expected Benefits

1. **Performance**: Async/await is more efficient than callbacks
2. **Readability**: Modern Python syntax is cleaner
3. **Type Safety**: Pydantic validation + type hints
4. **Developer Experience**: Better tooling support
5. **Maintainability**: Less boilerplate, clearer code flow
6. **Documentation**: Auto-generated API docs
7. **Testing**: Better async testing support

## Risks & Mitigation

### Risk: Breaking existing functionality
**Mitigation**: Incremental migration, keep old code tagged

### Risk: WebSocket compatibility
**Mitigation**: Test extensively, may need custom connection manager

### Risk: Performance regression
**Mitigation**: Benchmark before/after, optimize hot paths

### Risk: Data migration issues
**Mitigation**: Test with copy of production data first

## Timeline Estimate

- Phase 1-2: 1 day (setup + deps)
- Phase 3-4: 3-5 days (core migration)
- Phase 5: 2 days (testing)
- Phase 6-7: 1 day (cleanup + optimization)
- Phase 8: 1 day (documentation)

**Total: ~8-10 days of focused work**
