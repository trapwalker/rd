# -*- coding: utf-8 -*-
from __future__ import absolute_import
import logging

log = logging.getLogger(__name__)


from sublayers_common.handlers.base import BaseHandler
from tornado.web import HTTPError

from sublayers_common.user_profile import User
from sublayers_site.handlers.site_auth import LOGIN_RE

import re
LOGIN_TEST = re.compile(r'^[a-zA-Z_][a-zA-Z0-9_-]{2,19}$')  # Взят из from sublayers_site.handlers.site_auth. LOGIN_RE

class AdmEngineHandler(BaseHandler):
    access_level = 1

    def prepare(self):
        super(AdmEngineHandler, self).prepare()
        if not self.current_user or self.current_user.access_level < self.access_level:
            log.warning('%s ACCESS DENIED!', self.classname)
            raise HTTPError(403)

    def user_online(self, username):
        return self.application.srv.agents_by_name.get(username, None)

    def get_user(self, username):
        if username and LOGIN_TEST.match(username):
            for agent in self.application.srv.agents_by_name.values():
                if agent.user and agent.user.name == username:
                    return agent.user
            return User.get_by_name(username)
        return None


class AdmFindUsers(AdmEngineHandler):
    def get(self):
        find_str = self.get_argument("find", "")
        online_only = self.get_argument("online", "")
        server = self.application.srv
        users = []
        if online_only:
            users = [agent.user for agent in server.agents_by_name.values() if agent.user and agent.connection]
        elif find_str and LOGIN_TEST.match(find_str):
            users = User.objects(name__contains=find_str, quick=False).limit(50)
        self.render("adm/find.html", users=users, find=find_str, server=server)


class AdmMain(AdmEngineHandler):
    def get(self):
        self.xsrf_token  # info: Вызывается, чтобы положить в куку xsrf_token - странно!
        self.render("adm/main.html", server=self.application.srv)

    def post(self):
        action = self.get_argument('action', '')

        if action == 'server_block':
            minutes = int(self.get_argument('minutes', 0))
            self.application.srv.block_connects(seconds=minutes * 60)
            self.finish('Server blocked')
            return
        self.finish('OK')