# -*- coding: utf-8 -*-
"""Смоук сайт-сервера: страницы и site_api без 500-х."""

import json

import pytest

from tests.integration.conftest import LegacyClient

SITE_GET_ROUTES = [
    '/',
    '/login',
    '/site_api/locale',
    '/site_api/ping',
    '/site_api/audio1',
    '/email_confirm',
]

SITE_POST_JSON_ROUTES = [
    ('/site_api/get_user_info', {}),
    ('/site_api/get_rpg_info', {}),
    ('/site_api/get_user_rpg_info', {}),
    ('/site_api/get_quick_game_records', {}),
]

# эти обработчики читают form-аргументы, а не JSON-тело
SITE_POST_FORM_ROUTES = [
    ('/site_api/get_rating_info', {'rating_name': 'Traiders'}),
    ('/site_api/get_user_info_by_id', {'user_id': '000000000000000000000000'}),
]


@pytest.fixture(scope='module')
def site_client(site_server):
    client = LegacyClient(site_server[0])
    client.get('/')  # получить _xsrf
    return client


@pytest.mark.parametrize('path', SITE_GET_ROUTES)
def test_site_get_no_500(site_client, path):
    status, _h, body = site_client.get(path)
    assert status < 500, '{}: {} {!r}'.format(path, status, body[:200])


@pytest.mark.parametrize('path,payload', SITE_POST_JSON_ROUTES)
def test_site_post_no_500(site_client, path, payload):
    status, _h, body = site_client.post_json(path, payload)
    assert status < 500, '{}: {} {!r}'.format(path, status, body[:300])


@pytest.mark.parametrize('path,payload', SITE_POST_FORM_ROUTES)
def test_site_post_form_no_500(site_client, path, payload):
    status, _h, body = site_client.post(path, payload)
    assert status < 500, '{}: {} {!r}'.format(path, status, body[:300])


def test_site_index_content(site_client):
    status, _h, body = site_client.get('/')
    assert status == 200
    text = body.decode('utf-8')
    assert 'Road Dogs' in text


def test_get_user_info_anon_is_valid_json(site_client):
    status, _h, body = site_client.post_json('/site_api/get_user_info', {})
    assert status < 500
    if status == 200:
        json.loads(body.decode('utf-8'))
