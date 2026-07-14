# -*- coding: utf-8 -*-
"""Pytest-конфигурация интеграционных тестов реестра.

Тестам нужен запущенный MongoDB (localhost:27017); если его нет — тесты
пропускаются, а не падают.
"""

import pytest


@pytest.fixture(scope='session', autouse=True)
def mongo_connection():
    import pymongo
    from mongoengine import connect, disconnect

    try:
        client = pymongo.MongoClient('localhost', 27017, serverSelectionTimeoutMS=2000)
        client.admin.command('ping')
        client.close()
    except Exception:
        pytest.skip('MongoDB недоступен (localhost:27017) — интеграционные тесты реестра пропущены')

    db = connect(db='rd_tree_test')
    yield db
    db.drop_database('rd_tree_test')
    disconnect()
