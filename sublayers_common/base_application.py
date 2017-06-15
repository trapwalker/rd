#!/usr/bin/env python
# -*- coding: utf-8 -*-
from __future__ import absolute_import

import sys
import os


def parent_folder(fn):
    return os.path.abspath(os.path.join(os.path.dirname(fn), '..'))


sys.path.append(parent_folder(__file__))

import logging
import logging.config

logging.config.fileConfig("logging.conf")
log = logging.getLogger(__name__)

import tornado.escape
import tornado.ioloop
import tornado.web
import tornado.websocket
from tornado.options import options
from urlparse import urlparse
from pymongo import MongoClient
import mongoengine

from sublayers_common import service_tools


class DBError(Exception):
    pass


class BaseApplication(tornado.web.Application):
    def __init__(self, handlers=None, default_host="", transforms=None, **settings):
        self.name = os.path.basename(sys.argv[0])  # todo: add service name attribute to Application class
        try:
            self.revision = service_tools.HGRevision()
        except Exception as e:
            self.revision = None
            log.warning("Can't get HG revision info: %s", e)

        try:
            self.version = service_tools.HGVersion()
        except Exception as e:
            self.version = None
            log.warning("Can't get project verion info: %s", e)

        dsn = urlparse(options.db)
        self.dba = mongoengine.connect(
            db=dsn.path.lstrip('/'),
            host=dsn.hostname,
            port=dsn.port,
        )
        self.db = MongoClient(options.db)[dsn.path.lstrip('/')]

        log.info('=-' * 25)
        log.info('SERVICE INIT: {self.name} v={self.version}'.format(self=self))
        log.info('REVISION {self.revision}'.format(self=self))
        log.info('--' * 25)

        settings.setdefault('xsrf_cookies', True)
        settings.setdefault('autoreload', False)
        settings.setdefault('cookie_secret', options.cookie_secret)
        settings.setdefault('template_path', options.template_path)
        settings.setdefault('debug', options.debug)

        super(BaseApplication, self).__init__(
            handlers=handlers,
            default_host=default_host,
            transforms=transforms,
            **settings
        )

    def stop(self):
        log.debug('====== ioloop before stop')
        tornado.ioloop.IOLoop.instance().stop()
        log.debug('====== ioloop after stop')
