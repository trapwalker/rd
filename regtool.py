# -*- coding: utf-8 -*-
from __future__ import absolute_import, print_function
import sys, os
import logging
log = logging.getLogger(__name__)

if __name__ == '__main__':
    project_root = os.path.dirname(sys.argv[0])
    log = logging.getLogger()
    sys.path.append(project_root)
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
    log.debug('Delete all registry objects: %s', (yield Root.objects.filter({'fixtured': False}).delete()))  # todo: make deletion fixtures only

    log.debug('Loading registry fixtures to DB...')
    reg = yield Root.load(path=os.path.join(project_root, u'sublayers_world', u'registry'))
    log.debug('Loading registry fixtures DONE')  # todo: show timing and counts

    #nodes = yield Root.objects.filter(uri={'$ne': None}).find_all()
    #reg = Root.objects.get_cached('reg:///registry')
    #a = reg['agents/user']
    #u = a.instantiate(profile_id='123456')
    #yield u.load_references()
    #yield u.save(upsert=True)

    #car = yield Root.objects.get('reg:///registry/mobiles/cars/middle/sports/delorean_dmc12')
    # log.debug('object by parents: %s', id(car.parent.parent.parent))
    # cars = yield Root.objects.get('reg:///registry/mobiles/cars')
    # log.debug('cars by uri: %s', id(cars))
    # c = yield Root.objects.get('reg:///registry/a/b/c')
    #cc = yield Root.objects.get('reg:///registry/a/b/cc')
    # log.debug('A by parents of C: %s', id(c.parent.parent))
    # a = yield Root.objects.get('reg:///registry/a')
    # log.debug('A by uri: %s', id(a))

    # cc = yield Root.objects.get('reg:///registry/a/b/cc')
    # cc2 = Root.objects.get_cached('reg:///registry/a/b/cc')
    #print('\n'.join((
    #    '{v:6} - {k}'.format(v=v, k=k)
    #    for k, v in
    #    sorted(_call_stat.items(), key=lambda kv: kv[1], reverse=True)[:50]
    #)))
    r = Root.objects.get_cached('reg:///registry')
    #x = r['mobiles/cars/middle/sports/delorean_dmc12']
    #print('r_cc_dirt' in x._values)
    globals().update(**locals())
    print('THE END')
    tornado.ioloop.IOLoop.instance().add_callback(lambda: io_loop.stop())


if __name__ == '__main__':
    from collections import Counter
    io_loop.add_callback(test_registry)
    start()
