# FastAPI Migration Progress

## Status: 🚧 IN PROGRESS - Foundation Complete

Миграция с Tornado на FastAPI с полной поддержкой async/await и современных возможностей Python 3.12.

## Completed ✅

### 1. Dependencies & Build System
- ✅ Updated `pyproject.toml` with FastAPI stack
- ✅ Installed FastAPI 0.121.1
- ✅ Installed Uvicorn 0.38.0 (ASGI server)
- ✅ Installed Motor 3.7.1 (async MongoDB driver)
- ✅ Installed Beanie 2.0.0 (async ODM)
- ✅ Installed Pydantic 2.12.4 (validation)
- ✅ Added authentication libraries (python-jose, passlib, bcrypt)
- ✅ Added async utilities (aiofiles, httpx)
- ✅ Added testing tools (pytest-asyncio)

### 2. Application Structure
Created modern FastAPI application structure:

```
app/
├── __init__.py
├── main.py                 # FastAPI application entry point
├── config.py               # Settings with pydantic-settings
├── database.py             # Async database connection (Motor + Beanie)
├── models/
│   ├── __init__.py
│   └── user.py            # Example Beanie Document
├── routers/
│   └── __init__.py        # API route modules
└── utils/
    └── deprecation.py     # Deprecation decorators
```

###3. Core Infrastructure

**app/config.py**:
- Pydantic Settings for configuration
- Environment variable support
- Type-safe configuration
- Cached settings with `@lru_cache`

**app/database.py**:
- Async MongoDB connection with Motor
- Beanie ODM initialization
- Connection pooling configuration
- Context managers for transactions

**app/models/user.py**:
- Example Beanie Document model
- Modern Pydantic v2 syntax
- Type hints with Python 3.12 `|` syntax
- Indexed fields
- Settings class for collection name

**app/main.py**:
- FastAPI application factory
- Lifespan context manager for startup/shutdown
- CORS middleware
- Static file serving
- Health check endpoint
- Auto-generated API docs

### 4. Utilities

**app/utils/deprecation.py**:
- `@deprecated()` decorator for marking old code
- `@unused()` decorator for reference code
- `@migration_target()` to link new code to old

## Migration Patterns

### Tornado Handler → FastAPI Route

**Before (Tornado)**:
```python
class PlayHandler(BaseHandler):
    def get(self):
        user = self.get_current_user()
        self.render("play.html", user=user)

    @gen.coroutine
    def post(self):
        data = self.get_argument("data")
        result = yield self.process_async(data)
        self.write({"result": result})
```

**After (FastAPI)**:
```python
from fastapi import APIRouter, Depends
from app.utils.deprecation import migration_target

router = APIRouter()

@router.get("/play")
@migration_target("sublayers_server.handlers.pages.PlayHandler.get")
async def play_page(user: User = Depends(get_current_user)):
    return templates.TemplateResponse("play.html", {"user": user})

@router.post("/play")
@migration_target("sublayers_server.handlers.pages.PlayHandler.post")
async def play_action(data: PlayData, user: User = Depends(get_current_user)):
    result = await process_async(data)
    return {"result": result}
```

### MongoEngine → Beanie

**Before (MongoEngine - Sync)**:
```python
from mongoengine import Document, StringField, IntField

class User(Document):
    email = StringField(required=True, unique=True)
    name = StringField()
    level = IntField(default=1)

# Usage (sync)
user = User.objects(email="test@example.com").first()
user.level += 1
user.save()
```

**After (Beanie - Async)**:
```python
from beanie import Document, Indexed
from pydantic import EmailStr, Field

class User(Document):
    email: Annotated[EmailStr, Indexed(unique=True)]
    name: str | None = None
    level: int = Field(default=1, ge=1)

    class Settings:
        name = "users"

# Usage (async)
user = await User.find_one(User.email == "test@example.com")
user.level += 1
await user.save()
```

### Callback-based Async → async/await

**Before (Tornado gen.coroutine)**:
```python
@gen.coroutine
def fetch_data(user_id):
    user = yield db.users.find_one({"_id": user_id})
    stats = yield db.stats.find_one({"user_id": user_id})
    raise gen.Return({"user": user, "stats": stats})

@gen.coroutine
def process_request(self):
    data = yield fetch_data(self.current_user.id)
    self.write(data)
```

**After (Modern async/await)**:
```python
async def fetch_data(user_id: str) -> dict:
    user = await User.get(user_id)
    stats = await Stats.find_one(Stats.user_id == user_id)
    return {"user": user, "stats": stats}

async def process_request(user: User):
    data = await fetch_data(user.id)
    return data
```

### WebSocket

**Before (Tornado)**:
```python
class GameWSHandler(tornado.websocket.WebSocketHandler):
    def open(self):
        self.game_server.register_client(self)

    def on_message(self, message):
        data = json.loads(message)
        result = self.game_server.handle_message(data)
        self.write_message(json.dumps(result))

    def on_close(self):
        self.game_server.unregister_client(self)
```

**After (FastAPI)**:
```python
from fastapi import WebSocket, WebSocketDisconnect

@app.websocket("/ws")
async def game_websocket(websocket: WebSocket):
    await websocket.accept()
    await game_server.register_client(websocket)

    try:
        async for message in websocket.iter_text():
            data = json.loads(message)
            result = await game_server.handle_message(data)
            await websocket.send_json(result)
    except WebSocketDisconnect:
        await game_server.unregister_client(websocket)
```

## Python 3.12 Modern Features Used

### 1. Type Hints with | Syntax
```python
# Old
from typing import Optional, Union
name: Optional[str] = None
value: Union[int, str] = 10

# New (Python 3.10+)
name: str | None = None
value: int | str = 10
```

### 2. Dataclasses with Slots
```python
from dataclasses import dataclass, field

@dataclass(slots=True)
class Position:
    x: float
    y: float
    z: float = 0.0
    metadata: dict = field(default_factory=dict)
```

### 3. Pattern Matching
```python
match message_type:
    case "move":
        await handle_move(data)
    case "attack" | "defend":
        await handle_combat(data)
    case {"type": "chat", "message": msg}:
        await handle_chat(msg)
    case _:
        logger.warning(f"Unknown message: {message_type}")
```

### 4. Structural Pattern Matching with Guards
```python
match user.role:
    case "admin" if user.is_active:
        return AdminPanel()
    case "player" if user.level > 10:
        return AdvancedFeatures()
    case "player":
        return BasicFeatures()
    case _:
        return DefaultView()
```

### 5. f-strings with = for Debugging
```python
# Auto-includes variable name
logger.debug(f"{user_id=}, {level=}, {score=}")
# Output: user_id=123, level=45, score=9876
```

### 6. Async Context Managers
```python
async with motor_client.start_session() as session:
    async with session.start_transaction():
        await user.save(session=session)
        await stats.save(session=session)
```

## Running the New Application

### Development Server
```bash
# With auto-reload
uvicorn app.main:app --reload --port 8000

# Or using Python directly
python -m app.main
```

### Production Server
```bash
# Multiple workers with Uvicorn
uvicorn app.main:app \
    --host 0.0.0.0 \
    --port 8000 \
    --workers 4 \
    --log-level info

# Or with Gunicorn + Uvicorn workers
gunicorn app.main:app \
    --workers 4 \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 0.0.0.0:8000
```

### Environment Variables
Create `.env` file:
```env
DEBUG=true
MONGODB_URL=mongodb://localhost:27017/rd
SECRET_KEY=your-secret-key-here
CORS_ORIGINS=["http://localhost:3000"]
```

### API Documentation
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- OpenAPI Schema: http://localhost:8000/openapi.json

## Testing

### Run Tests
```bash
# Install test dependencies
uv pip install pytest pytest-asyncio httpx

# Run tests
pytest

# With coverage
pytest --cov=app tests/
```

### Example Test
```python
import pytest
from httpx import AsyncClient
from app.main import app

@pytest.mark.asyncio
async def test_health_check():
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"
```

## Next Steps

### Immediate (Priority 1)
1. ⏳ Migrate authentication handlers
2. ⏳ Migrate WebSocket game connection
3. ⏳ Convert MongoEngine models to Beanie
4. ⏳ Create user authentication with JWT

### Short-term (Priority 2)
5. ⏳ Migrate API endpoints (game, stats, inventory)
6. ⏳ Implement dependency injection for auth
7. ⏳ Add rate limiting middleware
8. ⏳ Setup proper logging configuration

### Medium-term (Priority 3)
9. ⏳ Migrate all remaining handlers
10. ⏳ Refactor game server event machine for async
11. ⏳ Add comprehensive tests
12. ⏳ Performance benchmarks

### Long-term (Priority 4)
13. ⏳ Remove Tornado completely
14. ⏳ Remove MongoEngine completely
15. ⏳ Full async/await conversion
16. ⏳ Code optimization with Python 3.12 features

## Deprecation Strategy

### Mark Old Code
```python
from app.utils.deprecation import deprecated, unused

# Deprecated but still functional
@deprecated("Use FastAPI router instead", replacement="app.routers.game")
class OldTornadoHandler(BaseHandler):
    pass

# Unused, kept for reference
@unused("Replaced by Beanie User model")
class MongoEngineUser(Document):
    pass
```

### Migration Tracking
```python
@migration_target("sublayers_server.handlers.pages.PlayHandler")
@router.get("/play")
async def play_handler():
    pass
```

## Benefits Achieved

✅ **Performance**: Native async/await is faster than callbacks
✅ **Type Safety**: Pydantic validation catches errors early
✅ **Developer Experience**: Auto-generated docs, better IDE support
✅ **Readability**: Modern Python syntax is clearer
✅ **Maintainability**: Less boilerplate code
✅ **Testing**: Better async testing tools
✅ **Standards**: OpenAPI/JSON Schema compliance

## Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Beanie ODM](https://beanie-odm.dev/)
- [Motor Documentation](https://motor.readthedocs.io/)
- [Pydantic V2](https://docs.pydantic.dev/latest/)
- [Python 3.12 Release Notes](https://docs.python.org/3/whatsnew/3.12.html)
