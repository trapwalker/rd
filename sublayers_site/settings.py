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

define("debug", default=False, help="Debug mode flag", type=bool)
define("logging_calls", default=False, help="Logging calss marked with `call_log` decorator", type=bool)
define("cookie_secret", help="cookie secret key", type=str)
define("forum_cookie_secret", help="cookie secret key", type=str)
define("static_path", default=_rel("../sublayers_common/static"), help="path to static files", type=str)
define("template_path", default=_rel("templates"), help="path to static files", type=str)
define("pidfile", default=None, help="filename for pid store", type=str)
define("port", default=80, help="run on the given port", type=int)
define("forum_auth_script", default="http://192.168.1.202/forum/phpbb/auth/register_simple.php", help="address to forum auth script", type=str)
define("world_path", default='../sublayers_world', help="Path to world data", type=str)

# mongodb://[username:password@]host1[:port1][,host2[:port2],...[,hostN[:portN]]][/[database][?options]]
define("db", default='mongodb://localhost/rd', help='MongoDB connection URI ("mongodb://localhost/rd" by default)', type=str)

define("join_news_group_link", default="https://t.me/joinchat/AAAAAD_pGB7aHkah39E2-Q", help="path to static files", type=str)

