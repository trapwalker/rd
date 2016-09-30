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

    #log.debug('Delete all: %s', (yield Root.objects.delete()))
    #reg = yield Root.load(path=ur'D:\Home\svp\projects\sublayers\sublayers_world\registry')
    #log.debug('Delete all saved objects: %s', (yield Root.objects.filter({'fixtured': False}).delete()))

    nodes = yield Root.objects.filter(fixtured=True).find_all()
    reg = Root.objects.get_cached('reg:///registry')
    a = reg['agents/user/quick']
    x = reg['mobiles/cars/middle/sports/delorean_dmc12']
    
    u = a.instantiate(profile_id='111')
    yield u.load_references()
    #x1 = x.instantiate()
    #u.car = x1
    yield u.save(upsert=True)
    log.debug('### Registry test end')
    print('\n'.join((
        '{v:6} - {k}'.format(v=v, k=k)
        for k, v in
        sorted(_call_stat.items(), key=lambda kv: kv[1], reverse=True)[:50]
    )))
    #"""
    #x2 = x.instantiate()

    u2 = a.instantiate(profile_id='222')
    yield u2.load_references()
    yield u2.save(upsert=True)


    a2 = yield a.objects.get(profile_id='123456')
    print('a2.position =', a2 and a2.position)
    #a2.car = x1
    #yield a2.save(upsert=True)

    a3 = yield a.objects.get(profile_id='123456')
    print('a3.car =', a3 and a3.car)

    Q = reg['quests/examples/mortal_course']
    q = Q.instantiate(abstract=False)
    

    
    #a2.position = [123, 456]
    #print('a2.position =', a2.position)
    #yield a2.save()

    globals().update(**locals())
    print('THE END')
    tornado.ioloop.IOLoop.instance().add_callback(lambda: io_loop.stop())


if __name__ == '__main__':
    from collections import Counter
    io_loop.add_callback(test_registry)
    start()
