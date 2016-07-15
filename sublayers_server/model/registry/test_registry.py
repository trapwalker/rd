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
from sublayers_server.model.registry.tree import Root
from sublayers_server.model.registry.uri import URI
from sublayers_server.model.registry.odm.doc import _call_stat

import yaml
import tornado.gen
from pprint import pprint as pp


@tornado.gen.coroutine
def test_registry():
    log.debug('### test registry')

    #reg = yield Root.load(path=ur'D:\Home\svp\projects\sublayers\sublayers_world\registry')
    car = yield Root.objects.get('reg:///registry/mobiles/cars/middle/sports/delorean_dmc12')
    
    log.debug('### Registry test end')
    print('\n'.join((
        '{v:6} - {k}'.format(v=v, k=k)
        for k, v in
        sorted(_call_stat.items(), key=lambda kv: kv[1], reverse=True)[:50]
    )))
    globals().update(**locals())


if __name__ == '__main__':
    from collections import Counter
    io_loop.add_callback(test_registry)
    start()
