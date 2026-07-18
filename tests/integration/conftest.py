# -*- coding: utf-8 -*-
"""Интеграционные тесты легаси-серверов (Tornado).

Поднимают настоящий engine-сервер (basic) отдельным процессом с изолированной
БД и гоняют против него HTTP/WebSocket-сценарии. Требуют MongoDB на
localhost:27017 и полные данные мира (sublayers_world) — иначе пропускаются.

Запуск: pytest tests/integration -q
"""

import os
import secrets
import socket
import subprocess
import sys
import time
import re

import pytest

REPO_ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), '../..'))
ENGINE_DIR = os.path.join(REPO_ROOT, 'sublayers_server')
SITE_DIR = os.path.join(REPO_ROOT, 'sublayers_site')
# engine_server.py / engine_server_quick.py / site_server.py all fall back to
# a random per-process cookie_secret if COOKIE_SECRET isn't set (see
# sublayers_server/settings.py) - fine standalone, but these tests span
# multiple spawned server processes that need to read/write the *same*
# secure "user" cookie, so pin one value for all of them here.
TEST_COOKIE_SECRET = secrets.token_hex(32)
SUBPROCESS_ENV = dict(os.environ, COOKIE_SECRET=TEST_COOKIE_SECRET)
# Matches docker-compose.yml's mongodb service, which requires auth - a bare
# "mongodb://localhost/..." 404s every spawned server with "OperationFailure:
# requires authentication" against that container. Override via env if you
# run a separate, unauthed test-only mongod instead.
TEST_DB = os.environ.get(
    'TEST_MONGODB_URL',
    'mongodb://admin:admin_password@localhost/rd_integration_test?authSource=admin',
)
_MONGO_AUTH = dict(username='admin', password='admin_password', authSource='admin')

# Запуск engine-сервера: загрузка мирового реестра занимает десятки секунд
ENGINE_START_TIMEOUT = 180
SITE_START_TIMEOUT = 60


def _mongo_available():
    try:
        with socket.create_connection(('localhost', 27017), timeout=2):
            return True
    except OSError:
        return False


def _free_port():
    with socket.socket() as s:
        s.bind(('127.0.0.1', 0))
        return s.getsockname()[1]


def _wait_http(port, path='/', timeout=ENGINE_START_TIMEOUT, proc=None):
    import urllib.request
    import urllib.error

    deadline = time.time() + timeout
    url = 'http://localhost:{}{}'.format(port, path)
    while time.time() < deadline:
        if proc is not None and proc.poll() is not None:
            raise RuntimeError('Server process died with code {}'.format(proc.returncode))
        try:
            urllib.request.urlopen(url, timeout=5)
            return
        except urllib.error.HTTPError:
            return  # любой HTTP-ответ означает, что сервер поднялся
        except Exception:
            time.sleep(1)
    raise TimeoutError('Server on port {} did not start in {}s'.format(port, timeout))


@pytest.fixture(scope='session')
def mongo():
    if not _mongo_available():
        pytest.skip('MongoDB недоступен на localhost:27017')
    yield
    # подчистить тестовую базу
    try:
        import pymongo
        client = pymongo.MongoClient('localhost', 27017, serverSelectionTimeoutMS=2000, **_MONGO_AUTH)
        client.drop_database('rd_integration_test')
        client.close()
    except Exception:
        pass


@pytest.fixture(scope='session')
def engine_server(mongo, tmp_path_factory):
    """Работающий basic engine-сервер. Возвращает базовый URL."""
    if not os.path.isdir(os.path.join(REPO_ROOT, 'sublayers_world', 'registry')):
        pytest.skip('Нет данных мира (sublayers_world/registry)')

    port = _free_port()
    log_path = tmp_path_factory.mktemp('logs') / 'engine.log'
    log_file = open(log_path, 'w')
    proc = subprocess.Popen(
        [sys.executable, 'engine_server.py',
         '--mode=basic', '--port={}'.format(port), '--db={}'.format(TEST_DB)],
        cwd=ENGINE_DIR, stdout=log_file, stderr=subprocess.STDOUT, env=SUBPROCESS_ENV,
    )
    try:
        _wait_http(port, '/login', proc=proc)
    except Exception:
        proc.terminate()
        log_file.close()
        sys.stderr.write(open(log_path).read()[-4000:])
        raise
    yield 'http://localhost:{}'.format(port), port, log_path
    proc.terminate()
    proc.wait(timeout=15)
    log_file.close()


@pytest.fixture(scope='session')
def site_server(mongo, tmp_path_factory):
    """Работающий site-сервер. Возвращает базовый URL."""
    port = _free_port()
    log_path = tmp_path_factory.mktemp('logs') / 'site.log'
    log_file = open(log_path, 'w')
    proc = subprocess.Popen(
        [sys.executable, 'site_server.py',
         '--port={}'.format(port), '--db={}'.format(TEST_DB)],
        cwd=SITE_DIR, stdout=log_file, stderr=subprocess.STDOUT, env=SUBPROCESS_ENV,
    )
    try:
        _wait_http(port, '/', timeout=SITE_START_TIMEOUT, proc=proc)
    except Exception:
        proc.terminate()
        log_file.close()
        sys.stderr.write(open(log_path).read()[-4000:])
        raise
    yield 'http://localhost:{}'.format(port), port, log_path
    proc.terminate()
    proc.wait(timeout=15)
    log_file.close()


class LegacyClient:
    """Мини-клиент с куками и xsrf для tornado-серверов."""

    def __init__(self, base_url):
        import http.cookiejar
        import urllib.request

        self.base_url = base_url
        self.jar = http.cookiejar.CookieJar()
        self.opener = urllib.request.build_opener(
            urllib.request.HTTPCookieProcessor(self.jar),
            NoRedirect(),
        )

    def cookie(self, name):
        for c in self.jar:
            if c.name == name:
                return c.value
        return None

    def get(self, path, headers=None):
        return self._request('GET', path, None, headers)

    def post(self, path, data=None, headers=None):
        import urllib.parse
        body = None
        if data is not None:
            if isinstance(data, dict):
                if self.cookie('_xsrf') and '_xsrf' not in data:
                    data = dict(data, _xsrf=self.cookie('_xsrf'))
                body = urllib.parse.urlencode(data).encode('utf-8')
            else:
                body = data if isinstance(data, bytes) else data.encode('utf-8')
        return self._request('POST', path, body, headers)

    def post_json(self, path, obj, headers=None):
        import json
        headers = dict(headers or {})
        headers['Content-Type'] = 'application/json'
        xsrf = self.cookie('_xsrf')
        if xsrf:
            headers['X-XSRFToken'] = xsrf
        return self._request('POST', path, json.dumps(obj).encode('utf-8'), headers)

    def _request(self, method, path, body, headers):
        import urllib.request
        import urllib.error

        req = urllib.request.Request(
            self.base_url + path, data=body, method=method, headers=headers or {})
        try:
            resp = self.opener.open(req, timeout=30)
            return resp.status, resp.headers, resp.read()
        except urllib.error.HTTPError as e:
            return e.code, e.headers, e.read()


class NoRedirect(__import__('urllib.request', fromlist=['HTTPRedirectHandler']).HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


@pytest.fixture()
def engine_client(engine_server):
    base, _port, _log = engine_server
    c = LegacyClient(base)
    c.get('/login')  # получить _xsrf куку
    return c


def register_user(client, suffix=''):
    """Регистрирует свежего пользователя, возвращает (email, password, username)."""
    ts = re.sub(r'\D', '', repr(time.time()))
    email = 'it{}{}@example.com'.format(ts, suffix)
    username = 'ITester{}{}'.format(ts, suffix)
    password = 'Passw0rd'
    status, headers, _ = client.post('/login/standard', {
        'action': 'reg', 'email': email, 'password': password, 'username': username,
    })
    assert status == 302, 'registration failed: {}'.format(status)
    assert headers.get('Location') == '/', 'unexpected redirect: {}'.format(headers.get('Location'))
    assert client.cookie('user'), 'user cookie is not set after registration'
    return email, password, username
