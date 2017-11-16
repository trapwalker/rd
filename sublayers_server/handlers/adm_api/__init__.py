# -*- coding: utf-8 -*-
from __future__ import absolute_import

from sublayers_server.handlers.adm_api.srv_control import ServerSaveHandler, ServerShutdownHandler
from sublayers_server.handlers.adm_api.user_control import UserStatusHandler, UserAccessLevelSetup
from sublayers_server.handlers.adm_api.html_adms_base import AdmFindUsers, AdmMain
from sublayers_server.handlers.adm_api.html_adms_agents import (AdmUserInfoHandler, AdmAgentInfoHandler,
                                                                AdmAgentQuestsInfoHandler, AdmAgentQuestsInventoryHandler)


handlers = [
    (r"/adm/api/shutdown", ServerShutdownHandler,),
    (r"/adm/api/save", ServerSaveHandler,),
    (r"/adm/api/user", UserStatusHandler,),
    (r"/adm/api/user_access", UserAccessLevelSetup,),

    # HTML admin
    (r"/adm/api/html", AdmMain,),
    (r"/adm/api/html/find", AdmFindUsers,),
    (r"/adm/api/html/user_info", AdmUserInfoHandler,),
    (r"/adm/api/html/agent_info", AdmAgentInfoHandler,),
    (r"/adm/api/html/agent_info_quests", AdmAgentQuestsInfoHandler,),
    (r"/adm/api/html/agent_info_quests_inventory", AdmAgentQuestsInventoryHandler,),

]
