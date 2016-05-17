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
from motorengine.fields import IntField


class A(Node):
    __collection__ = 'test_a'
    x = IntField()
    
class B(A):
    __collection__ = 'test_b'
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
    def test():
        log.debug('test start')
        a = A(name='a', doc='aa', x=13)
        b = B(name='b', parent=a, y=14)

        log.debug('saved: %r', (yield a.save()))
        log.debug('saved: %r', (yield b.save()))

        log.debug('a: %r', a)
        log.debug('b: %r', b)

        for i, aa in enumerate((yield A.objects.find_all())):
            print('A::', i, repr(aa))

        for i, bb in enumerate((yield B.objects.find_all())):
            print('B::', i, repr(bb))

        log.debug('no more')

        globals().update(locals())


    io_loop.add_callback(test)

    c = Cnt(21)
    
    tornado.ioloop.PeriodicCallback(lambda: (
        print('%s,' % c.inc(-1), end='')
        or io_loop._timeouts
        or log.info('Stopping.')
        or io_loop.stop()
    ), 1000).start()
    io_loop.start()
    log.info('Terminated.')
    
