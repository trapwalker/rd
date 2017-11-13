# -*- coding: utf-8 -*-
from __future__ import absolute_import

from sublayers_server.handlers.adm_api.srv_control import ServerSaveHandler, ServerShutdownHandler
from sublayers_server.handlers.adm_api.user_control import UserStatusHandler, UserAccessLevelSetup


handlers = [
    (r"/adm/api/shutdown", ServerShutdownHandler,),
    (r"/adm/api/save", ServerSaveHandler,),
    (r"/adm/api/user", UserStatusHandler,),
    (r"/adm/api/user_access", UserAccessLevelSetup,),
]
