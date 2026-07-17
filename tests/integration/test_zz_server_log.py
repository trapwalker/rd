# -*- coding: utf-8 -*-
"""Финальный инвариант: за всю тестовую сессию в логе engine-сервера
не должно появиться ни одного traceback (имя файла с zz — выполняется
последним при алфавитном порядке сбора)."""

import re


def test_no_tracebacks_in_engine_log(engine_server):
    _base, _port, log_path = engine_server
    text = open(log_path, encoding='utf-8', errors='replace').read()
    tracebacks = re.findall(r'Traceback \(most recent call last\):(?:\n.+)+', text)
    assert not tracebacks, (
        'В логе сервера {} traceback(ов). Первый:\n{}'.format(
            len(tracebacks), tracebacks[0][:2000]))


def test_no_unicode_errors_in_engine_log(engine_server):
    _base, _port, log_path = engine_server
    text = open(log_path, encoding='utf-8', errors='replace').read()
    for marker in ('UnicodeDecodeError', 'UnicodeEncodeError', "b'\\x"):
        assert marker not in text, 'В логе сервера найден признак проблем кодировок: {}'.format(marker)
