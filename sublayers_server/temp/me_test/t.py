#!/usr/bin/env python
# -*- coding: utf-8 -*-
from __future__ import absolute_import, print_function

import sys
import os


def parent_folder(fn):
    return os.path.abspath(os.path.join(os.path.dirname(fn), '..'))

sys.path.append(parent_folder(__file__))

import logging
import logging.config

#logging.config.fileConfig("logging.conf")
log = logging.getLogger()
log.setLevel(logging.DEBUG)
log.addHandler(logging.StreamHandler(sys.stderr))


from sublayers_server.model.registry.odm import AbstractDocument
from sublayers_server.model.registry.odm.fields import IntField, ReferenceField, StringField


class A0(AbstractDocument):
    pass


class A(A0):
    lnk = ReferenceField(AbstractDocument)
    m = StringField()
    x = IntField()


if __name__ == '__main__':
    from pprint import pprint as pp
    import tornado.ioloop
    import tornado.gen
    from motorengine import connect

    class Cnt(object):
        def __init__(self, v=0):
            self.c = v

        def inc(self, v=1):
            self.c += v
            return self.c

        def __str__(self):
            return '<{}>'.format(self.c)

    io_loop = tornado.ioloop.IOLoop.instance()
    db = connect("test3", host="localhost", port=27017, io_loop=io_loop)

    @tornado.gen.coroutine
    def test_store():
        log.debug('### test save/load consystency')
        print((yield A.objects.delete()))
        #uid1 = ObjectId("5745ae217ee5fe05ece75f58")
        #print('uid1=', uid1)

        a = A(m='a', x=13)#, _id=uid1)
        log.debug('created a[%s]: %r', id(a), a)
        aa = yield a.save()
        log.debug('saved id=%r, aa[%s->%s]: %r', a._id, id(a), id(aa), aa)

        log.debug('-----------------------')

        b = A(m='b', x=14, lnk=a)#, id=uid1)
        log.debug('created b[%s]: %r', id(b), b)
        bb = yield b.save()
        log.debug('saved id=%r, bb[%s->%s]: %r', b._id, id(b), id(bb), bb)

        log.debug('=======================')

        A._objects_cache.clear()
        log.debug('Cache cleaned.')

        aaa = yield AbstractDocument.objects.get(id=a._id)
        log.debug('loaded aaa[%s->%s]: %r', id(a), id(aaa), aaa)

        bbb = yield AbstractDocument.objects.get(id=b._id)
        log.debug('loaded bbb[%s->%s]: %r', id(b), id(bbb), bbb)

        bbbb = yield AbstractDocument.objects.get(id=b._id)
        log.debug('loaded bbbb[%s->%s]: %r', id(bbb), id(bbbb), bbbb)

        log.debug('id(bbb.lnk) %s id(a)', '==' if id(bbb.lnk) == id(a) else '!=')
        log.debug('id(bbb.lnk) %s id(aaa)', '==' if id(bbb.lnk) == id(aaa) else '!=')

        log.debug('THE END ' + '########################################')
        globals().update(locals())

    io_loop.add_callback(test_store)    

    c = Cnt(5)
     
    tornado.ioloop.PeriodicCallback(lambda: (
        print('%s,' % c.inc(-1), end='')
        or io_loop._timeouts
        or c.c > 0
        or log.info('Stopping.')
        or io_loop.stop()
    ), 1000).start()
    io_loop.start()
    log.info('Terminated.')
    
