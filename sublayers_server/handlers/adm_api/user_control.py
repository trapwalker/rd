# -*- coding: utf-8 -*-
from __future__ import absolute_import


from sublayers_server.handlers.adm_api.base import AdmAPIHandler
from sublayers_server.model.utils import serialize
from sublayers_common.user_profile import User

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



class UserAccessLevelSetup(AdmAPIHandler):
    _name_ = 'user_access'
    def post(self, *args, **kwargs):
        if not self.is_local_request():
            self.finish('Only Local requests')
        username = self.get_argument("username", None)
        access = self.get_argument("access", None)
        if not username or access is None:
            self.finish('Bad arguments')
            return
        access = int(access)
        user = None
        srv = self.application.srv
        for a in srv.agents_by_name.values():  # Поискать юзера с таким именем на сервере, если нет, то в базе
            if a.user and a.user.name == username:
                user = a.user
                break
        if user is None:  # Ищем в базе
            user = User.get_by_name(name=username)
        if user is None:
            self.finish('User <{}> not found'.format(username))
            return
        user.access_level = access
        user.save()
        self.finish("Access level for {} changed to: {}".format(user, access))
