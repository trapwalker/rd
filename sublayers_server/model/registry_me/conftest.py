# -*- coding: utf-8 -*-
"""Pytest-конфигурация интеграционных тестов реестра.

Тестам нужен запущенный MongoDB (localhost:27017); если его нет — тесты
пропускаются, а не падают.
"""

import os

import pytest

# Matches docker-compose.yml's mongodb service, which requires auth - a bare
# connect(db=...) 404s every test with "OperationFailure: requires
# authentication" against that container. Override via env if you run a
# separate, unauthed test-only mongod instead.
_MONGO_HOST = os.environ.get('TEST_MONGO_HOST', 'localhost')
_MONGO_PORT = int(os.environ.get('TEST_MONGO_PORT', '27017'))
_MONGO_USER = os.environ.get('TEST_MONGO_USER', 'admin')
_MONGO_PASSWORD = os.environ.get('TEST_MONGO_PASSWORD', 'admin_password')


@pytest.fixture(scope='session', autouse=True)
def mongo_connection():
    import pymongo
    from mongoengine import connect, disconnect

    try:
        client = pymongo.MongoClient(
            _MONGO_HOST, _MONGO_PORT,
            username=_MONGO_USER, password=_MONGO_PASSWORD, authSource='admin',
            serverSelectionTimeoutMS=2000,
        )
        client.admin.command('ping')
        client.close()
    except Exception:
        pytest.skip('MongoDB недоступен ({}:{}) — интеграционные тесты реестра пропущены'.format(_MONGO_HOST, _MONGO_PORT))

    db = connect(
        db='rd_tree_test', host=_MONGO_HOST, port=_MONGO_PORT,
        username=_MONGO_USER, password=_MONGO_PASSWORD, authentication_source='admin',
    )
    yield db
    db.drop_database('rd_tree_test')
    disconnect()
