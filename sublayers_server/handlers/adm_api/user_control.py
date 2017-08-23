# -*- coding: utf-8 -*-
from __future__ import absolute_import


from sublayers_server.handlers.adm_api.base import AdmAPIHandler
from sublayers_server.model.utils import serialize

from json import dumps


class UserStatusHandler(AdmAPIHandler):
    _name_ = 'user.status'
    def get(self, *args, **kwargs):
        self.set_header('Content-Type', 'text/html; charset=utf-8')
        srv = self.application.srv
        npc = self.get_argument('npc', '-')

        agents = [
            a.adm_info
            for a in srv.agents_by_name.values()
            if
                npc == '-'
                or npc in {'0', 'no', 'n'} and a.user
                or npc in {'1', 'yes', 'y'} and a.user is None
        ]
        data = serialize(agents, ensure_ascii=False)
        self.write(data)

    def post(self, *args, **kwargs):

        pass  #self.application.srv.flash_save()
