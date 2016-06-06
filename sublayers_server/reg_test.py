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

from sublayers_server.model.registry.tree import Node
from motorengine.fields import IntField, ReferenceField
from bson import ObjectId


class A(Node):
    __lazy__ = False
    __collection__ = 'test_ab'
    lnk = ReferenceField('sublayers_server.model.registry.tree.Node')
    x = IntField()
    

class B(A):
    __lazy__ = False
    __collection__ = 'test_ab'
    y = IntField()


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
        print((yield B.objects.delete()))
        uid1 = ObjectId()
        print('uid1=', uid1)
        
        a = B(name='a', doc='aa', uri='reg://reg1/a13', fixtured=True, x=13, id=uid1)
        b = B(name='b', doc='bb', uri='reg://reg1/b14', fixtured=True, y=14, lnk=a)

        aa = yield a.save()
        bb = yield b.save()
        log.debug('saved A(%s->%s): %r', id(a), id(aa), aa)
        log.debug('saved B(%s->%s): %r', id(b), id(bb), bb)

        bbb = yield B.objects.get(_id=bb._id)
        log.debug('loaded B(%s->%s): %r', id(b), id(bbb), bbb)

        log.debug('no more ' + '#' * 20)

        globals().update(locals())


    @tornado.gen.coroutine
    def test_custom_id():
        log.debug('### test save with custom _id')
        new_id = ObjectId()
        log.debug('custom id = %s', new_id)

        obj1 = A(name='CustomIdObject', _id=new_id)
        log.debug('object BEFORE save[%s]: %r', id(obj1), obj1)

        obj2 = yield obj1.save(upsert=True)
        log.debug('object AFTER  save[%s]: %r', id(obj2), obj2)

        obj3 = yield A.objects.get(id=new_id)
        log.debug('object AFTER  LOAD[%s]: %r', id(obj3), obj3)
        
        globals().update(locals())
        log.debug('end ' + '#' * 20)

    #io_loop.add_callback(test_store)
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
    
