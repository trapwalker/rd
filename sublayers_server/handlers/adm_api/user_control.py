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
        agents = [a.adm_info for a in srv.agents_by_name.values()]
        data = serialize(agents, ensure_ascii=False)
        self.write(data)

    def post(self, *args, **kwargs):

        pass  #self.application.srv.flash_save()
