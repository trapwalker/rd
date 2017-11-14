# -*- coding: utf-8 -*-
from __future__ import absolute_import
import logging

log = logging.getLogger(__name__)


from sublayers_server.handlers.adm_api.html_adms_base import AdmEngineHandler

from sublayers_common.user_profile import User
from datetime import datetime, timedelta



class AdmUserInfoHandler(AdmEngineHandler):
    def get(self):
        self.xsrf_token  # info: Вызывается, чтобы положить в куку xsrf_token - странно!
        username = self.get_argument("username", "")
        server = self.application.srv
        user = self.get_user(username=username)
        if user:
            self.render("adm/user.html", user=user, server=server, ban_seconds_left=user.get_banned_seconds())
        else:
            self.send_error(404)

    def post(self):
        username = self.get_argument("username", "")
        user = self.get_user(username=username)
        if user is None:
            self.send_error(404)  # Ненайдено
            return
        # if self.user_online(username=user.name):
        #     self.send_error(503)  # Запрещено менять пользователей, которые онлайн
        #     return
        action = self.get_argument('action', '')

        if action == 'ban':
            minutes = int(self.get_argument('minutes', 0))
            reason = self.get_argument('reason', "")
            if minutes > 0:
                ban_time = datetime.now() + timedelta(minutes=minutes)
                user.ban_time = ban_time
                user.ban_reason = reason
                user.save()
                self.application.srv.disconnect_agent_by_name(user.name)
                self.finish('{} banned before {}.'.format(user.name, ban_time))
                return
            if minutes < 0:
                user.ban_reason = ""
                user.ban_time = datetime.fromtimestamp(0)
                user.save()
                self.finish('{} unbanned'.format(user.name))
                return

        self.finish('OK')



class AdmAgentInfoHandler(AdmEngineHandler):
    def get(self):
        pass