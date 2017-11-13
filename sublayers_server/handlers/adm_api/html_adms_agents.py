# -*- coding: utf-8 -*-
from __future__ import absolute_import
import logging

log = logging.getLogger(__name__)


from sublayers_server.handlers.adm_api.html_adms_base import AdmEngineHandler, LOGIN_TEST

from sublayers_common.user_profile import User


class AdmUserInfoHandler(AdmEngineHandler):
    def get(self):
        username = self.get_argument("username", "")
        reg = self.application.srv.reg
        user = None
        if username and LOGIN_TEST.match(username):
            user = User.get_by_name(username)
        if user:
            self.render("adm/user.html", user=user, reg=reg)
        else:
            self.send_error(404)

    def post(self):
        pass



class AdmAgentInfoHandler(AdmEngineHandler):
    def get(self):
        pass