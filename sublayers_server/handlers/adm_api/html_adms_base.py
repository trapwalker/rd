# -*- coding: utf-8 -*-
from __future__ import absolute_import
import logging

log = logging.getLogger(__name__)


from sublayers_common.handlers.base import AuthHandlerMixin
from tornado.web import HTTPError

from sublayers_common.user_profile import User
from sublayers_site.handlers.site_auth import LOGIN_RE

import re
LOGIN_TEST = re.compile(r'^[a-zA-Z_][a-zA-Z0-9_-]{2,19}$')  # Взят из from sublayers_site.handlers.site_auth. LOGIN_RE

class AdmEngineHandler(AuthHandlerMixin):
    access_level = 1

    def prepare(self):
        super(AdmEngineHandler, self).prepare()
        if self.current_user.access_level < self.access_level:
            log.warning('%s ACCESS DENIED!', self.classname)
            raise HTTPError(403)


class AdmFindUsers(AdmEngineHandler):
    def get(self):
        find_str = self.get_argument("find", "")
        server = self.application.srv
        users = []
        if find_str and LOGIN_TEST.match(find_str):
            users = User.objects(name__contains=find_str).limit(50)
        self.render("adm/find.html", users=users, find=find_str, server=server)
