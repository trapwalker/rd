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
from sublayers_server.model.registry.tree import Root, _call_stat
from sublayers_server.model.registry.uri import URI

import yaml
import tornado.gen
from pprint import pprint as pp


@tornado.gen.coroutine
def test_registry():
    log.debug('### test registry')
    reg = yield Root.load(path=ur'D:\Home\svp\projects\sublayers\sublayers_world\registry')
    log.debug('### Registry test end')
    pp(sorted(_call_stat.items(), reverse=True))
    globals().update(**locals())


if __name__ == '__main__':
    from collections import Counter
    io_loop.add_callback(test_registry)
    start()
