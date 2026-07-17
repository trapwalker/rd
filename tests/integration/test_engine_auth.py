# -*- coding: utf-8 -*-
"""Аутентификация на engine-сервере: регистрация, логин, /play."""

from tests.integration.conftest import LegacyClient, register_user


class TestRegistration:
    def test_register_and_play(self, engine_client):
        register_user(engine_client)

        status, _h, body = engine_client.get('/play')
        assert status == 200
        text = body.decode('utf-8')
        assert 'ws_port' in text or 'websocket' in text.lower() or 'NUKE' in text

    def test_register_duplicate_email(self, engine_client, engine_server):
        email, password, username = register_user(engine_client)

        other = LegacyClient(engine_server[0])
        other.get('/login')
        status, headers, _ = other.post('/login/standard', {
            'action': 'reg', 'email': email, 'password': 'Xx123456', 'username': username + 'x',
        })
        assert status == 302
        assert '/login?' in headers.get('Location', ''), 'должен вернуть на /login с сообщением'

    def test_register_wrong_data(self, engine_client):
        status, _h, _b = engine_client.post('/login/standard', {
            'action': 'reg', 'email': '', 'password': '', 'username': '',
        })
        assert status == 400

    def test_wrong_action(self, engine_client):
        status, _h, _b = engine_client.post('/login/standard', {'action': 'hack'})
        assert status == 405


class TestLogin:
    def test_login_logout_flow(self, engine_client, engine_server):
        email, password, _username = register_user(engine_client)

        # логаут
        status, headers, _ = engine_client.get('/logout')
        assert status == 302

        # логин с верным паролем
        status, headers, _ = engine_client.post('/login/standard', {
            'action': 'auth', 'email': email, 'password': password,
        })
        assert status == 302
        assert headers.get('Location') == '/'

        status, _h, _b = engine_client.get('/play')
        assert status == 200

    def test_login_wrong_password(self, engine_client):
        email, _password, _username = register_user(engine_client)
        engine_client.get('/logout')

        status, headers, _ = engine_client.post('/login/standard', {
            'action': 'auth', 'email': email, 'password': 'WRONG',
        })
        assert status == 302
        assert '/login?' in headers.get('Location', '')

    def test_login_unknown_email(self, engine_client):
        status, headers, _ = engine_client.post('/login/standard', {
            'action': 'auth', 'email': 'nobody@example.com', 'password': 'x',
        })
        assert status == 302
        assert '/login?' in headers.get('Location', '')

    def test_play_requires_auth(self, engine_server):
        anon = LegacyClient(engine_server[0])
        status, headers, _ = anon.get('/play')
        assert status == 302
        assert 'login' in headers.get('Location', '')
