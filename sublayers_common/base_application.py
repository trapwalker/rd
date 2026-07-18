#!/usr/bin/env python
# -*- coding: utf-8 -*-

import sys
import os


def parent_folder(fn):
    return os.path.abspath(os.path.join(os.path.dirname(fn), '..'))


sys.path.append(parent_folder(__file__))

import logging
log = logging.getLogger(__name__)

import tornado.escape
import tornado.ioloop
import tornado.web
import tornado.websocket
from tornado.options import options
from urllib.parse import urlparse
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
        # Pass the full URI so mongoengine picks up username/password/authSource
        # from it too - building the connection from dsn.hostname/dsn.port alone
        # silently drops credentials, which breaks against an auth-enabled Mongo.
        self.dba = mongoengine.connect(host=options.db)
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

        self.http_server_settings = dict(
            xheaders=True,
        )

    def stop(self):
        log.debug('==== IOLoop stop')
        tornado.ioloop.IOLoop.instance().stop()

    def listen(self, port, address="", **kwargs):
        ext_settings = dict()
        ext_settings.update(self.http_server_settings)
        ext_settings.update(kwargs)
        super(BaseApplication, self).listen(port=port, address=address, **ext_settings)
