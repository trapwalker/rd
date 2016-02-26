#!/usr/bin/env python

import logging
log = logging.getLogger(__name__)

import os
import tornado.options
from tornado.options import define


def load(filename, local_filename=None):
    if local_filename is None:
        local_filename = 'local.{}'.format(filename)

    log.info('Try to load config file: %r', filename)
    tornado.options.parse_config_file(filename, final=False)
    try:
        log.info('Try to load local config file: %r', local_filename)
        tornado.options.parse_config_file(local_filename, final=False)
    except IOError as e:
        log.warning('Local configuration file load FAIL: %s', e)
    else:
        log.info('Local configuration file (%r) load OK', local_filename)
    log.info('Parse command line options')
    tornado.options.parse_command_line(final=True)
    log.info('Options load DONE')


def _rel(*folders):
    return os.path.join(os.path.dirname(__file__), *folders)


# Options definintion block:

define("cookie_secret", help="cookie secret key", type=str)
define("static_path", default=_rel("static"), help="path to static files", type=str)
define("template_path", default=_rel("templates"), help="path to static files", type=str)
define("pidfile", default=None, help="filename for pid store", type=str)
define("port", default=80, help="run on the given port", type=int)
define("ws_port", default=80, help="run ws on the given port", type=int)
define("map_link", default='http://localhost/map/{z}/{x}/{y}.jpg', help="map link", type=str)

define("disconnect_timeout", default=60, help="Timeout of displacing by disconnect.", type=int)

define("world_path", default='./world', help="Path to world data", type=str)


