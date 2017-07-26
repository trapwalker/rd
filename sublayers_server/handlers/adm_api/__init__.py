# -*- coding: utf-8 -*-
from __future__ import absolute_import

from sublayers_server.handlers.adm_api.srv_control import ServerSaveHandler, ServerShutdownHandler


handlers = [
    (r"/adm/api/save", ServerSaveHandler,),
    (r"/adm/api/shutdown", ServerShutdownHandler,),
]
