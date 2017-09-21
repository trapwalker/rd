#!/usr/bin/env python
# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

import os
import tornado.options
from tornado.options import define


def load(filename, local_filename=None):
    if local_filename is None:
        filename_dir, filename_name = os.path.split(filename)
        local_filename = os.path.join(filename_dir, 'local.{}'.format(filename_name))

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

define("debug", default=False, help="Debug mode flag", type=bool)
define("logging_calls", default=False, help="Logging calss marked with `call_log` decorator", type=bool)

define("service_name", default="sl", help="Game server service name", type=str)

define("cookie_secret", help="cookie secret key", type=str)
define("static_path", default=_rel("../sublayers_common/static"), help="path to static files", type=str)
define("mobile_host", default="roaddogs.ru", help="mobile host adress", type=str)
define("template_path", default=_rel("templates"), help="path to static files", type=str)
define("pidfile", default=None, help="filename for pid store", type=str)
define("port", default=80, help="run on the given port", type=int)
define("ws_port", default=80, help="run ws on the given port", type=int)
define("map_link", default='http://localhost/map', help="map link", type=str)

define("disconnect_timeout", default=60, help="Timeout of displacing by disconnect.", type=int)

define("world_path", default=u'../sublayers_world', help="Path to world data", type=unicode)
define("zones_disable", default=False, help="Zones activation disable", type=bool)
define("server_stat_log_interval", default=10, help="Server stat log interval", type=int)
define("statistic_path", default='../sublayers_common/static/stat/', help="Server stat log path", type=str)

define("quick_debug", default=False, help="quick debug flag", type=bool)

define("mode", default="basic", help="server mode. available values: basic, quick", type=str)

# mongodb://[username:password@]host1[:port1][,host2[:port2],...[,hostN[:portN]]][/[database][?options]]
define("db", default='mongodb://localhost/rd', help='MongoDB connection URI ("mongodb://localhost/rd" by default)', type=str)
define("reg_reload", default=False, help="Reload registry", type=bool)
define("bot_reset", default=False, help="Reset bot state", type=bool)

define("show_agents_log", default=False, help="Handle personal agent log to STDERR", type=bool)
