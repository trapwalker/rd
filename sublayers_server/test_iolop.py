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

import tornado.ioloop
from motorengine import connect
from pprint import pprint as pp


class Cnt(object):
    def __init__(self, v=0):
        self.c = v

    def inc(self, v=1):
        self.c += v
        return self.c

    def __str__(self):
        return '<{}>'.format(self.c)


io_loop = tornado.ioloop.IOLoop.instance()
db = connect("rd", host="localhost", port=27017, io_loop=io_loop)
c = Cnt(25)


def start():
    # tornado.ioloop.PeriodicCallback(lambda: (
    #     print('%s,' % c.inc(-1), end='')
    #     or io_loop._timeouts
    #     or c.c > 0
    #     or log.info('Stopping.')
    #     or io_loop.stop()
    # ), 1000).start()
    io_loop.start()
    log.info('Terminated.')


if __name__ == '__main__':
    import tornado.gen

    @tornado.gen.coroutine
    def test_store():
        log.debug('### test ioloop')

        log.debug('THE END ' + '########################################')
        globals().update(locals())

    io_loop.add_callback(test_store)
    start()
