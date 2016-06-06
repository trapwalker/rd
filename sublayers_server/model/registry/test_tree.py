﻿# -*- coding: utf-8 -*-
from __future__ import absolute_import, print_function
import sys
import logging
log = logging.getLogger(__name__)

if __name__ == '__main__':
    log = logging.getLogger()
    sys.path.append('../../..')
    log.level = logging.DEBUG
    log.addHandler(logging.StreamHandler(sys.stderr))

import tornado.gen
from pprint import pprint as pp
from sublayers_server.test_iolop import io_loop, start

from sublayers_server.model.registry import classes  # Не удалять этот импорт! Авторегистрация классов.
from sublayers_server.model.registry.tree import Node
from sublayers_server.model.registry.odm.fields import StringField, IntField
from sublayers_server.model.registry.uri import URI


class A(Node):
    x = IntField()


class B(A):
    y = IntField()


@tornado.gen.coroutine
def test_store():
    log.debug('### test tree')
    print((yield A.objects.delete()))

    a = yield A(name='a', x=3).save()
    b = yield B(name='b', y=4, parent=a).save()
    Node.objects_cache.clear()

    aa = yield Node.objects.get(id=a._id)
    log.debug('aa[%s]: %r', id(aa), aa)

    bb = yield Node.objects.get(id=b._id)
    log.debug('aa[%s]: %r', id(bb), bb)

    log.debug('THE END ' + '########################################')
    globals().update(locals())


if __name__ == '__main__':
    io_loop.add_callback(test_store)
    start()
