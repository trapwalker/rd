# -*- coding: utf-8 -*-
from __future__ import print_function

import logging.handlers
import sys
import os

from sublayers_common.logging_tools import handler, logger, Formatter

BASE_PATH = os.path.dirname(__file__)
local_path = lambda f: os.path.join(BASE_PATH, f)


def init(quick_mode=False):
    log_path_suffix = '_quick' if quick_mode else ''

    formatter_simple  = Formatter(u'%(relativeCreated)08d %(levelname)-7s %(message)s')
    formatter_complex = Formatter(u'%(asctime)s %(levelname)-7s [%(filename)21s:%(lineno)-4d] %(message)s')
    formatter_websrv  = Formatter(u'%(asctime)s %(levelname)-7s %(message)s')
    formatter_events  = Formatter(u'%(asctime)s %(levelname)-7s %(message)s')
    formatter_stat    = Formatter(u'%(message)s')


    handler_null      = logging.NullHandler()
    handler_screen    = handler(fmt=formatter_simple, stream=sys.stderr)
    handler_main_file = handler(
        fmt=formatter_complex,
        cls=logging.handlers.TimedRotatingFileHandler,
        when='midnight',
        backupCount=5,
        encoding='utf-8',
        filename=local_path('log{}/server.log'.format(log_path_suffix)),
    )
    handler_websrv_file = handler(
        fmt=formatter_websrv,
        cls=logging.handlers.TimedRotatingFileHandler,
        when='midnight',
        backupCount=5,
        encoding='utf-8',
        filename=local_path('log{}/websrv.log'.format(log_path_suffix)),
    )
    handler_events_file = handler(
        fmt=formatter_events,
        cls=logging.handlers.TimedRotatingFileHandler,
        when='midnight',
        backupCount=5,
        encoding='utf-8',
        filename=local_path('log{}/events.log'.format(log_path_suffix)),
    )
    handler_errors_file = handler(
        fmt=formatter_complex,
        cls=logging.handlers.TimedRotatingFileHandler,
        when='midnight',
        backupCount=5,
        encoding='utf-8',
        filename=local_path('log{}/errors.log'.format(log_path_suffix)),
        level='ERROR',
    )
    handler_party_file = handler(
        fmt=formatter_complex,
        cls=logging.handlers.TimedRotatingFileHandler,
        when='midnight',
        backupCount=5,
        encoding='utf-8',
        filename=local_path('log{}/party.log'.format(log_path_suffix)),
    )
    handler_quest_file = handler(
        fmt=formatter_complex,
        cls=logging.handlers.TimedRotatingFileHandler,
        when='midnight',
        backupCount=5,
        encoding='utf-8',
        filename=local_path('log{}/quest.log'.format(log_path_suffix)),
    )
    handler_stat_file = handler(
        fmt=formatter_stat,
        cls=logging.handlers.TimedRotatingFileHandler,
        when='h',
        interval=1,
        backupCount=24,
        encoding='utf-8',
        filename=local_path('_stat{}/stat.csv'.format(log_path_suffix)),
    )
    handler_stat_file_events = handler(
        fmt=formatter_stat,
        cls=logging.handlers.TimedRotatingFileHandler,
        when='h',
        interval=1,
        backupCount=24,
        encoding='utf-8',
        filename=local_path('_stat{}/stat_events.csv'.format(log_path_suffix)),
    )

    log_root       = logger(None,                            level='DEBUG', propagate=1, handlers=[handler_errors_file, handler_main_file, handler_screen])
    log_app        = logger('tornado.application',           level='DEBUG', propagate=1, handlers=[handler_errors_file, handler_main_file, handler_screen])
    log_events     = logger('sublayers_server.model.events', level='INFO',  propagate=0, handlers=[handler_errors_file, handler_events_file])
    log_party      = logger('sublayers_server.model.party',  level='DEBUG', propagate=1, handlers=[handler_errors_file, handler_party_file])
    log_websrv     = logger('tornado.access',                level='DEBUG', propagate=0, handlers=[handler_websrv_file])
    log_pil        = logger('PIL.PngImagePlugin',            level='INFO',  propagate=0, handlers=[handler_null])
    log_stat       = logger('statlog',                       level='INFO',  propagate=0, handlers=[handler_stat_file])
    log_statevents = logger('statlog_events',                level='INFO',  propagate=0, handlers=[handler_stat_file_events])
    log_quest      = logger('sublayers_server.model.registry_me.classes.quests', level='DEBUG', propagate=1, handlers=[handler_errors_file, handler_quest_file])
