# -*- coding: utf-8 -*-
from __future__ import absolute_import, print_function
import sys
import logging
log = logging.getLogger(__name__)

if __name__ == '__main__':
    log = logging.getLogger()
    sys.path.append('../../..')
    log.level = logging.DEBUG
    log.addHandler(logging.StreamHandler(sys.stderr))

from sublayers_server.test_iolop import io_loop, start
from sublayers_server.model.registry import classes  # Не удалять этот импорт! Авторегистрация классов.
from sublayers_server.model.registry import storage
from sublayers_server.model.registry.uri import URI

import yaml
import tornado.gen
from pprint import pprint as pp


@tornado.gen.coroutine
def test_registry():
    log.debug('### test registry')
    reg = storage.Registry(name='registry')
    log.debug('Empty registry created')
    yield reg.load(path=ur'D:\Home\svp\projects\sublayers\sublayers_world\registry')
    log.debug('### Registry test end')
    globals().update(**locals())


if __name__ == '__main__':
    io_loop.add_callback(test_registry)
    start()
