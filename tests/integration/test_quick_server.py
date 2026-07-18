# -*- coding: utf-8 -*-
"""Смоук quick-режима игрового сервера (быстрая игра)."""

import os
import subprocess
import sys

import pytest

from tests.integration.conftest import (
    ENGINE_DIR, REPO_ROOT, TEST_DB, SUBPROCESS_ENV, LegacyClient, _free_port, _wait_http,
)


@pytest.fixture(scope='module')
def quick_server(mongo, tmp_path_factory):
    if not os.path.isdir(os.path.join(REPO_ROOT, 'sublayers_world', 'registry')):
        pytest.skip('Нет данных мира (sublayers_world/registry)')

    port = _free_port()
    log_path = tmp_path_factory.mktemp('logs') / 'quick.log'
    log_file = open(log_path, 'w')
    proc = subprocess.Popen(
        [sys.executable, 'engine_server_quick.py',
         '--mode=quick', '--port={}'.format(port), '--db={}'.format(TEST_DB)],
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


QUICK_GET_ROUTES = [
    '/',
    '/play',
    '/login',
    '/api/quick_game_cars',
    '/api/get_quick_game_cars',
    '/api/locale',
    '/stat',
]


@pytest.mark.parametrize('path', QUICK_GET_ROUTES)
def test_quick_route_no_500(quick_server, path):
    client = LegacyClient(quick_server[0])
    status, _h, body = client.get(path)
    assert status < 500, '{}: {} {!r}'.format(path, status, body[:200])


def test_quick_game_cars_present(quick_server):
    """На quick-сервере прототипы машинок быстрой игры должны отдаваться."""
    client = LegacyClient(quick_server[0])
    status, _h, body = client.get('/api/quick_game_cars')
    assert status == 200, body[:200]
    text = body.decode('utf-8')
    assert 'car' in text.lower()
