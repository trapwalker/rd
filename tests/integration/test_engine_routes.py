# -*- coding: utf-8 -*-
"""Смоук всех HTTP-маршрутов engine-сервера: ни один не должен отвечать 500."""

import pytest

from tests.integration.conftest import LegacyClient, register_user

# Все GET-маршруты движка (кроме /ws и статики).
# Допустимы любые коды кроме 5xx: 200/302/400/403/404 — легитимные ответы
# на запрос без параметров или без подключённого агента.
ENGINE_GET_ROUTES = [
    '/',
    '/play',
    '/login',
    '/logout',
    '/stat',
    '/site_stat',
    '/stat/messages',
    '/stat/events',
    '/stat/handlers',
    '/stat/graphics',
    '/stat/event_graphics',
    '/stat/quests',
    '/api/locale',
    '/api/main_menu_nucoil',
    '/api/inventory',
    '/api/container',
    '/api/barter',
    '/api/person_info',
    '/api/corpse_info',
    '/api/menu_character',
    '/api/menu_car',
    '/api/menu_journal',
    '/api/menu_party',
    '/api/menu_settings',
    '/api/menu_radio',
    '/api/map_teaching',
    '/api/tca',
    '/api/context_panel/locations',
    '/api/quick_game_cars',
    '/api/get_car_info',
    '/api/get_user_info',
    '/api/get_user_info2',
    '/api/get_quick_game_cars',
    '/interlacing',
]


@pytest.mark.parametrize('path', ENGINE_GET_ROUTES)
def test_route_no_500_anon(engine_server, path):
    client = LegacyClient(engine_server[0])
    status, _h, body = client.get(path)
    assert status < 500, '{}: {} {!r}'.format(path, status, body[:200])


@pytest.fixture(scope='module')
def authed_client(engine_server):
    client = LegacyClient(engine_server[0])
    client.get('/login')
    register_user(client, suffix='r')
    return client


@pytest.mark.parametrize('path', ENGINE_GET_ROUTES)
def test_route_no_500_authed(authed_client, path):
    status, _h, body = authed_client.get(path)
    assert status < 500, '{}: {} {!r}'.format(path, status, body[:200])


def test_static_file(engine_server):
    client = LegacyClient(engine_server[0])
    status, _h, _b = client.get('/static/css/module-login.css')
    assert status == 200
