# -*- coding: utf-8 -*-
"""Игровой WebSocket: подключение агента, init-сообщения, RPC-вызовы."""

import asyncio
import json

import pytest

from tests.integration.conftest import LegacyClient, register_user


@pytest.fixture()
def game_session(engine_server):
    """Зарегистрированный пользователь + куки для ws-подключения."""
    base, port, _log = engine_server
    client = LegacyClient(base)
    client.get('/login')
    register_user(client, suffix='w')
    # /play создаёт агента на сервере
    status, _h, _b = client.get('/play')
    assert status == 200
    cookie_header = 'user={}'.format(client.cookie('user'))
    return port, cookie_header


def _ws_connect(port, cookie_header):
    from tornado.httpclient import HTTPRequest
    from tornado.websocket import websocket_connect

    req = HTTPRequest('ws://localhost:{}/ws'.format(port),
                      headers={'Cookie': cookie_header})
    return websocket_connect(req)


async def _collect_events(conn, count, timeout=20):
    events = []

    async def reader():
        while len(events) < count:
            msg = await conn.read_message()
            assert msg is not None, 'сервер закрыл соединение'
            package = json.loads(msg)
            assert package.get('message_type') == 'push'
            events.extend(package.get('events', []))

    await asyncio.wait_for(reader(), timeout=timeout)
    return events


def test_ws_connect_and_init_messages(game_session):
    port, cookie = game_session

    async def scenario():
        conn = await _ws_connect(port, cookie)
        events = await _collect_events(conn, 4)
        classes = {e.get('cls') for e in events}
        assert 'InitTime' in classes
        assert 'InitAgent' in classes
        conn.close()

    asyncio.run(scenario())


def test_ws_rpc_call_and_bad_json(game_session):
    port, cookie = game_session

    async def scenario():
        conn = await _ws_connect(port, cookie)
        await _collect_events(conn, 4)  # пропустить init

        async def read_answer(attempts=80):
            # RPC-ответ (message_type=answer) идёт вперемешку с потоком
            # push-сообщений (вход в локацию, квесты) — вычитываем до него
            for _ in range(attempts):
                msg = await asyncio.wait_for(conn.read_message(), timeout=20)
                assert msg is not None, 'соединение неожиданно закрыто'
                package = json.loads(msg)
                if package.get('message_type') == 'answer':
                    return package
            raise AssertionError('RPC-ответ не получен')

        # корректный RPC
        conn.write_message(json.dumps(
            {'call': 'console_cmd', 'params': {'cmd': 'help'}, 'rpc_call_id': 1}))
        answer = await read_answer()
        assert answer.get('error') is None, answer

        # некорректный JSON не должен ронять соединение
        conn.write_message('this is not json')
        answer = await read_answer()
        assert answer.get('error') is not None, answer

        # неизвестный метод не должен ронять соединение
        conn.write_message(json.dumps({'call': 'no_such_method_qq', 'params': {}}))
        answer = await read_answer()
        assert answer.get('error') is not None, answer

        conn.close()

    asyncio.run(scenario())


def test_ws_chat_cyrillic_roundtrip(game_session):
    """Кириллица в чате должна пройти весь путь сервера без искажений."""
    port, cookie = game_session
    text = 'Привет, Пустошь! Ёжик ъь №1 «тест»'

    async def scenario():
        conn = await _ws_connect(port, cookie)

        room_name = None
        deadline = 40
        while room_name is None and deadline:
            deadline -= 1
            msg = await asyncio.wait_for(conn.read_message(), timeout=20)
            assert msg is not None
            for e in json.loads(msg).get('events', []):
                if e.get('cls') == 'ChatRoomIncludeMessage':
                    room_name = e.get('room_name')
        assert room_name, 'не получили ни одной чат-комнаты в init-сообщениях'

        conn.write_message(json.dumps({
            'call': 'chat_message',
            'params': {'room_name': room_name, 'msg': text},
        }, ensure_ascii=False))

        for _ in range(60):
            msg = await asyncio.wait_for(conn.read_message(), timeout=20)
            assert msg is not None
            for e in json.loads(msg).get('events', []):
                if e.get('cls') == 'ChatRoomMessage' and e.get('msg') == text:
                    conn.close()
                    return
        raise AssertionError('своё сообщение с кириллицей не вернулось из чата')

    asyncio.run(scenario())


def test_ws_motion(game_session):
    """set_motion запускает физику движения (вектора, состояния) без ошибок."""
    port, cookie = game_session

    async def scenario():
        conn = await _ws_connect(port, cookie)

        # дождаться init с позицией агента
        init_agent = None
        for _ in range(40):
            msg = await asyncio.wait_for(conn.read_message(), timeout=20)
            assert msg is not None
            events = json.loads(msg).get('events', [])
            init_agent = next((e for e in events if e.get('cls') == 'InitAgent'), None)
            if init_agent:
                break
        assert init_agent, 'InitAgent не получен'

        # выход из локации на карту, затем движение
        conn.write_message(json.dumps({'call': 'exit_from_location', 'params': {}}))
        await asyncio.sleep(1)
        conn.write_message(json.dumps({
            'call': 'set_motion',
            'params': {'x': 0, 'y': 0, 'cc': 0.5, 'turn': 0},
        }))

        # ждём Update-сообщение о движении собственной машины
        for _ in range(80):
            msg = await asyncio.wait_for(conn.read_message(), timeout=20)
            assert msg is not None
            for e in json.loads(msg).get('events', []):
                cls_name = e.get('cls', '')
                if 'Update' in cls_name or 'Motion' in cls_name:
                    conn.close()
                    return
        raise AssertionError('не получено ни одного Update-сообщения о движении')

    asyncio.run(scenario())


def test_ws_requires_auth(engine_server):
    _base, port, _log = engine_server

    async def scenario():
        from tornado.httpclient import HTTPRequest, HTTPClientError
        from tornado.websocket import websocket_connect

        req = HTTPRequest('ws://localhost:{}/ws'.format(port))
        try:
            conn = await websocket_connect(req)
        except Exception:
            return  # отказ в хендшейке — допустимо
        # или соединение закрывается сразу (assert user в open())
        msg = await asyncio.wait_for(conn.read_message(), timeout=10)
        assert msg is None, 'анонимное ws-соединение не должно работать'

    asyncio.run(scenario())
