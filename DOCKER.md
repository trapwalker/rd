# Docker Deployment Guide

Complete guide for running RoadDogs with Docker in development and production environments.

## Quick Start

### Development Environment

1. **Clone and setup environment**:
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your settings
nano .env
```

2. **Start all services**:
```bash
# Start MongoDB, Redis, and FastAPI application
docker-compose up -d

# View logs
docker-compose logs -f app

# Check service health
docker-compose ps
```

3. **Access the application**:
- New FastAPI stack: http://localhost:8000 (API docs: http://localhost:8000/docs)
- Legacy stack (game/site/quick), through nginx: http://localhost:8080/play
- MongoDB: localhost:27017
- Redis: localhost:6379

4. **Stop services**:
```bash
docker-compose down

# Remove volumes (clean database)
docker-compose down -v
```

## Legacy Tornado Stack + Nginx (no CDN)

RoadDogs is mid-migration (see `CLAUDE.md`): the legacy Tornado game still
runs alongside the new FastAPI app. `docker-compose up` now also starts:

| Service | Image/target | Command | Reachable at |
|---|---|---|---|
| `game-engine` | `development` | `engine_server.py --mode=basic` | via nginx only |
| `site-server` | `development` | `site_server.py` | via nginx only |
| `quick-engine` | `development` | `engine_server_quick.py --mode=quick` | via nginx only |
| `nginx` | `nginx:1.27-alpine` | templated config | `http://localhost:${NGINX_HTTP_PORT:-8080}` |

`game-engine`/`site-server`/`quick-engine` are **not** published to the host -
nginx is the only entry point, exactly like production. This intentionally
mirrors the historical bare-metal layout at `nginx_conf/sites-available/rd.conf`
(kept as reference for non-Docker deploys), just pointed at Docker service
names instead of `127.0.0.1:<port>`.

### No CDN: tiles are served from the same machine

`/map`, `/static` and `/audio` are served by nginx directly from disk (see the
`nginx` service's volume mounts and `nginx_conf/templates/rd.conf.template`) -
no external CDN involved. URL convention: a request to
`/map/{layer}/{z}/{x}/{y}.png` is served from
`sublayers_world/tiles/map/{layer}/{z}/{x}/{y}.png`.

**Caveat:** the actual map tile imagery (`back`/`front`/`merged` PNG pyramids)
and audio files aren't in this repo - `sublayers_world/tiles/map/` and
`audio_static/` only contain placeholders today. The serving mechanism is
ready; you still need to drop the real tile/audio data into those folders
(or their mounted equivalents) for the map to render and audio to play.

### One place to change a port

Backend ports/hosts live in `.env` (`GAME_ENGINE_PORT`, `SITE_PORT`,
`QUICK_PORT`, `GAME_ENGINE_HOST`, `SITE_HOST`, `QUICK_HOST`,
`NGINX_HTTP_PORT`) and are consumed both by the backend service's own
`--port`/`--ws_port` CLI argument and by nginx's `proxy_pass` upstream in the
same template - change the value once in `.env`, both sides follow. The
`map_link` a page renders is always an origin-relative path (`/map`, never
`http://host:port/map`), so it works unchanged whichever port nginx is
published on - no host/port to keep in sync there at all. See
`sublayers_server/settings.py` (`map_link` option) and
`sublayers_common/static/js/slippy_map.js` (client-side fallback).

### Only nginx is exposed on port 80/8080

`NGINX_HTTP_PORT` defaults to `8080` in dev so it doesn't clash with anything
else already bound to `:80` on your machine; set it to `80` for a real VDS
(see `docker-compose.prod.yml`, which also switches Mongo credentials from
the dev placeholder to `${MONGO_ROOT_USER}`/`${MONGO_ROOT_PASSWORD}`).

## Development Workflow

### Hot Reload

The development container mounts your source code, enabling hot-reload:

```bash
# Start with hot-reload
docker-compose up

# Any changes to app/ directory will automatically reload the server
```

### Run Tests in Container

```bash
# Run tests
docker-compose exec app pytest

# Run tests with coverage
docker-compose exec app pytest --cov=app --cov-report=term

# Run specific test file
docker-compose exec app pytest tests/test_auth.py -v
```

### Database Management

```bash
# Access MongoDB shell
docker-compose exec mongodb mongosh

# Create database backup
docker-compose exec mongodb mongodump --out /backups/$(date +%Y%m%d)

# Restore database
docker-compose exec mongodb mongorestore /backups/20240101

# Access Redis CLI
docker-compose exec redis redis-cli
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f app
docker-compose logs -f mongodb

# Last 100 lines
docker-compose logs --tail=100 app
```

### Rebuild Containers

```bash
# Rebuild after dependency changes
docker-compose build app

# Rebuild without cache
docker-compose build --no-cache app

# Rebuild and restart
docker-compose up -d --build
```

## Production Deployment

### Prerequisites

1. **Server setup**:
```bash
# Install Docker and Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
sudo apt-get install docker-compose-plugin
```

2. **SSL Certificates** (recommended):
```bash
# Install Certbot
sudo apt-get install certbot

# Get certificates
sudo certbot certonly --standalone -d yourdomain.com
```

### Production Configuration

1. **Create production environment file**:
```bash
# Create .env.prod
cat > .env.prod <<EOF
# Application
ENVIRONMENT=production
DEBUG=false
LOG_LEVEL=INFO

# Security
SECRET_KEY=$(openssl rand -hex 32)

# Database
MONGO_ROOT_USER=admin
MONGO_ROOT_PASSWORD=$(openssl rand -hex 16)
MONGO_DATABASE=rd

# Redis
REDIS_PASSWORD=$(openssl rand -hex 16)

# CORS
CORS_ORIGINS=["https://yourdomain.com"]

# OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret
EOF
```

2. **Deploy with production compose file**:
```bash
# Start production stack
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# With Nginx reverse proxy
docker-compose -f docker-compose.yml -f docker-compose.prod.yml --profile production up -d
```

### Production Best Practices

#### 1. Database Backups

Create automated backup script:

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/var/backups/mongodb"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup
docker-compose exec -T mongodb mongodump --archive > "$BACKUP_DIR/backup_$DATE.archive"

# Compress
gzip "$BACKUP_DIR/backup_$DATE.archive"

# Remove backups older than 7 days
find "$BACKUP_DIR" -name "*.gz" -mtime +7 -delete
```

Add to crontab:
```bash
# Run daily at 2 AM
0 2 * * * /path/to/backup.sh
```

#### 2. Log Rotation

Configure Docker log limits in `/etc/docker/daemon.json`:

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

#### 3. Resource Limits

Production compose file includes resource limits:

```yaml
deploy:
  resources:
    limits:
      cpus: '1'
      memory: 1G
    reservations:
      cpus: '0.5'
      memory: 512M
```

#### 4. Health Checks

All services include health checks:

```bash
# Check service health
docker-compose ps

# View health check logs
docker inspect --format='{{json .State.Health}}' rd_app | jq
```

#### 5. Security

```bash
# Run as non-root user (already configured in Dockerfile)
# Verify
docker-compose exec app whoami  # Should output: appuser

# Use Docker secrets for sensitive data (Swarm mode)
echo "secret_value" | docker secret create db_password -
```

## Nginx Reverse Proxy

### Development

Nginx is optional in development. Enable with:

```bash
docker-compose --profile production up -d nginx
```

### Production Configuration

Create `nginx_conf/nginx.prod.conf`:

```nginx
events {
    worker_connections 1024;
}

http {
    upstream fastapi {
        server app:8000;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

    server {
        listen 80;
        server_name yourdomain.com;

        # Redirect HTTP to HTTPS
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name yourdomain.com;

        # SSL certificates
        ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

        # SSL configuration
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers on;

        # API endpoints
        location /api/ {
            limit_req zone=api_limit burst=20;
            proxy_pass http://fastapi;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # WebSocket
        location /ws {
            proxy_pass http://fastapi;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }

        # Static files
        location /static/ {
            alias /usr/share/nginx/html/static/;
            expires 30d;
            add_header Cache-Control "public, immutable";
        }

        # API documentation (disable in production if needed)
        location /docs {
            proxy_pass http://fastapi;
        }
    }
}
```

## Monitoring & Observability

### View Metrics

```bash
# Container stats
docker stats

# Service resource usage
docker-compose top

# System resource usage
docker system df
```

### Optional: Prometheus + Grafana

Add to `docker-compose.yml`:

```yaml
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    networks:
      - rd_network

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    volumes:
      - grafana_data:/var/lib/grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    networks:
      - rd_network
```

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker-compose logs app

# Check container status
docker-compose ps

# Restart specific service
docker-compose restart app

# Remove and recreate
docker-compose up -d --force-recreate app
```

### Database Connection Issues

```bash
# Verify MongoDB is running
docker-compose exec mongodb mongosh --eval "db.adminCommand('ping')"

# Check MongoDB logs
docker-compose logs mongodb

# Verify connection string
docker-compose exec app env | grep MONGODB_URL
```

### Port Already in Use

```bash
# Find process using port
sudo lsof -i :8000

# Kill process
kill -9 PID

# Or change port in docker-compose.yml
ports:
  - "8001:8000"  # Use 8001 on host
```

### Permission Issues

```bash
# Fix volume permissions
sudo chown -R 1000:1000 ./app ./logs

# Or run with user flag
docker-compose run --user root app bash
```

### Out of Disk Space

```bash
# Clean unused images
docker image prune -a

# Clean unused volumes
docker volume prune

# Clean everything
docker system prune -a --volumes
```

## CI/CD Integration

### GitHub Actions

See `.github/workflows/ci.yml` for CI/CD pipeline that:
- Runs tests
- Builds Docker images
- Runs security scans
- Deploys to production (optional)

### Manual Deployment

```bash
# Build production image
docker build -t roaddogs:latest --target production .

# Tag for registry
docker tag roaddogs:latest registry.example.com/roaddogs:latest

# Push to registry
docker push registry.example.com/roaddogs:latest

# Deploy on production server
docker pull registry.example.com/roaddogs:latest
docker-compose -f docker-compose.prod.yml up -d
```

## Scaling

### Horizontal Scaling (Docker Swarm)

```bash
# Initialize swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.prod.yml rd

# Scale application
docker service scale rd_app=4

# View services
docker service ls
```

### Load Balancing

Nginx automatically load balances between multiple app containers:

```nginx
upstream fastapi {
    least_conn;
    server app1:8000;
    server app2:8000;
    server app3:8000;
    server app4:8000;
}
```

## Performance Optimization

### Docker Build Cache

```bash
# Use BuildKit for faster builds
DOCKER_BUILDKIT=1 docker build -t roaddogs .

# Multi-stage builds already configured in Dockerfile
```

### Resource Allocation

Adjust in `docker-compose.prod.yml`:

```yaml
deploy:
  resources:
    limits:
      cpus: '2'      # Increase CPU limit
      memory: 2G     # Increase memory limit
```

### Database Optimization

```bash
# MongoDB with WiredTiger cache size
command: mongod --wiredTigerCacheSizeGB 2

# Redis with maxmemory
command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
```

## Support

For issues and questions:
- Check logs: `docker-compose logs`
- GitHub Issues: https://github.com/yourusername/rd/issues
- Documentation: CLAUDE.md, FASTAPI_MIGRATION.md
