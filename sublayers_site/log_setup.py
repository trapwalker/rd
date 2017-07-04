# -*- coding: utf-8 -*-
from __future__ import print_function

import logging.handlers
import sys
import os

from sublayers_common.logging_tools import handler, logger

BASE_PATH = os.path.dirname(__file__)
local_path = lambda f: os.path.join(BASE_PATH, f)


def init():
    formatter_simple  = logging.Formatter('%(relativeCreated)08d %(levelname)-7s %(message)s')
    formatter_complex = logging.Formatter('%(asctime)s %(levelname)-7s [%(filename)21s:%(lineno)-4d] %(message)s')
    formatter_websrv  = logging.Formatter('%(asctime)s %(levelname)-7s %(message)s')
    formatter_stat    = logging.Formatter('%(message)s')


    handler_null      = logging.NullHandler()
    handler_screen    = handler(fmt=formatter_simple, stream=sys.stderr)
    handler_main_file = handler(
        fmt=formatter_complex,
        cls=logging.handlers.TimedRotatingFileHandler,
        when='midnight',
        backupCount=5,
        encoding='utf-8',
        filename=local_path('log/server.log'),
    )
    handler_websrv_file = handler(
        fmt=formatter_websrv,
        cls=logging.handlers.TimedRotatingFileHandler,
        when='midnight',
        backupCount=5,
        encoding='utf-8',
        filename=local_path('log/websrv.log'),
    )
    handler_errors_file = handler(
        fmt=formatter_complex,
        cls=logging.handlers.TimedRotatingFileHandler,
        when='midnight',
        backupCount=5,
        encoding='utf-8',
        filename=local_path('log/errors.log'),
    )
    handler_stat_file = handler(
        fmt=formatter_stat,
        cls=logging.handlers.TimedRotatingFileHandler,
        when='h',
        interval=1,
        backupCount=24,
        encoding='utf-8',
        filename=local_path('_stat/stat.csv'),
    )

    log_root   = logger(None,                  level='DEBUG', propagate=1, handlers=[handler_main_file, handler_screen])
    log_websrv = logger('tornado.access',      level='DEBUG', propagate=0, handlers=[handler_websrv_file])
    log_app    = logger('tornado.application', level='DEBUG', propagate=1, handlers=[handler_main_file, handler_errors_file, handler_screen])
    log_errors = logger('sublayers_site',      level='ERROR', propagate=1, handlers=[handler_errors_file, handler_screen])
    log_stat   = logger('statlog',             level='INFO',  propagate=0, handlers=[handler_stat_file])
