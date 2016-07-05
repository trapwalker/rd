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

import tornado.gen
from pprint import pprint as pp
from sublayers_server.test_iolop import io_loop, start

#from sublayers_server.model.registry import classes  # Не удалять этот импорт! Авторегистрация классов.
from sublayers_server.model.registry.tree import Node
from sublayers_server.model.registry.odm.fields import StringField, IntField, EmbeddedDocumentField, JsonField, ListField
from sublayers_server.model.registry.uri import URI
#from sublayers_server.model.registry.ext_types import PositionField
from motorengine import Document
from sublayers_server.model.vectors import Point


class A(Node):
    x = IntField()

class B(A):
    y = IntField()
    p = ListField(
        #base_field=ListField(
            base_field=EmbeddedDocumentField(embedded_document_type=A)
        #)
    )
    #d = JsonField()


@tornado.gen.coroutine
def test_store():
    log.debug('### test tree')
    print((yield A.objects.delete()))

    a = A(name='a', x=3)
    log.debug('id(a)=%s', id(a))
    yield a.save()
    #Node.objects_cache.clear()
    b = B(name='b', y=4, parent=a.uri, owner=a, p=['reg://registry/a'],)
    yield b.load_references()
    log.debug('id(b.p[0].parent)=%s', id(b.p[0].parent))
    yield b.save()
    #Node.objects_cache.clear()

    aa = yield Node.objects.get(
        #a._id
        id='reg://registry/a',
    )
    log.debug('id(aa)=%s', id(aa))

    log.debug('aa[%s]: %s', id(aa), aa)

    bb = yield Node.objects.get(
        'reg://registry/a/b',
        #id=b._id,
    )
    log.debug('bb[%s]: %s', id(bb), bb)
    print(bb.parent)
    log.debug('before load references')
    # yield b.load_references()
    log.debug('after load references')
    # print(b.parent)

    log.debug('THE END ' + '########################################')
    globals().update(locals())


if __name__ == '__main__':
    io_loop.add_callback(test_store)
    start()
