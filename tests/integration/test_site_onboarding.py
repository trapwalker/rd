# -*- coding: utf-8 -*-
"""Полный онбординг регистрации на сайте:
reg → nickname → settings → chip → register."""

import json
import time

from tests.integration.conftest import LegacyClient


def test_full_site_registration_flow(site_server):
    client = LegacyClient(site_server[0])
    client.get('/')  # _xsrf

    ts = str(time.time()).replace('.', '')
    email = 'site{}@example.com'.format(ts)
    # LOGIN_RE на сайте: 4-20 символов, начинается с буквы/подчёркивания
    username = 'SU{}'.format(ts[-10:])

    # Шаг 1: регистрация (email+пароль) → статус nickname
    status, _h, body = client.post('/login', {
        'action': 'reg', 'email': email, 'password': 'Passw0rd',
    })
    assert status == 200, body[:300]
    assert json.loads(body)['status'] == 'success', body[:300]
    assert client.cookie('user'), 'кука user не установлена'

    # Получить доступные классы персонажа (нужен node_hash)
    status, _h, body = client.post_json('/site_api/get_rpg_info', {})
    assert status == 200, body[:300]
    rpg_info = json.loads(body.decode('utf-8'))
    class_list = rpg_info.get('class_list') or []
    assert class_list, 'реестр не вернул классы персонажей'
    class_node_hash = class_list[0].get('node_hash')
    assert class_node_hash, class_list[0]

    # Шаг 2: ник, аватар, класс → статус settings
    status, _h, body = client.post('/login', {
        'action': 'next',
        'username': username,
        'avatar_index': '0',
        'class_index': '0',
        'class_node_hash': class_node_hash,
    })
    assert status == 200, body[:300]
    assert json.loads(body)['status'] == 'success', body[:300]

    # Шаг 3: скилы/перки → статус chip
    status, _h, body = client.post('/login', {'action': 'next'})
    assert status == 200, body[:300]
    assert json.loads(body)['status'] == 'success', body[:300]

    # Шаг 4: чип → статус register (полностью зарегистрирован)
    status, _h, body = client.post('/login', {'action': 'next'})
    assert status == 200, body[:300]
    assert json.loads(body)['status'] == 'success', body[:300]

    # Профиль зарегистрированного пользователя отдаётся корректно
    status, _h, body = client.post_json('/site_api/get_user_info', {})
    assert status == 200, body[:300]
    info = json.loads(body.decode('utf-8'))
    assert info.get('user_status') == 'register', info
    assert info.get('user_name') == username, info


def test_site_registration_duplicate_email(site_server):
    client = LegacyClient(site_server[0])
    client.get('/')

    ts = str(time.time()).replace('.', '')
    email = 'dup{}@example.com'.format(ts)

    status, _h, body = client.post('/login', {
        'action': 'reg', 'email': email, 'password': 'Passw0rd',
    })
    assert status == 200 and json.loads(body)['status'] == 'success'

    other = LegacyClient(site_server[0])
    other.get('/')
    status, _h, body = other.post('/login', {
        'action': 'reg', 'email': email, 'password': 'Passw0rd',
    })
    assert status == 200, body[:300]
    assert json.loads(body)['status'] == 'fail_exist_email', body[:300]


def test_site_registration_wrong_input(site_server):
    client = LegacyClient(site_server[0])
    client.get('/')
    status, _h, body = client.post('/login', {
        'action': 'reg', 'email': 'no-at-sign', 'password': 'x',
    })
    assert status == 200, body[:300]
    assert json.loads(body)['status'] == 'fail_wrong_input', body[:300]
