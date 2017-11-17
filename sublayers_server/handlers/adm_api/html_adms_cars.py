# -*- coding: utf-8 -*-
from __future__ import absolute_import
import logging

log = logging.getLogger(__name__)


from sublayers_server.handlers.adm_api.html_adms_base import AdmEngineHandler

from sublayers_server.handlers.adm_api.html_adms_agents import AdmAgentInfoHandler

from sublayers_common.user_profile import User
from datetime import datetime, timedelta

from sublayers_server.model.registry_me.classes.agents import Agent

import uuid


class AdmCarInfoHandler(AdmAgentInfoHandler):
    def get_car(self, profile, car_uid):
        if profile.car and profile.car.uid == car_uid:
            return profile.car
        for car in profile.car_list:
            if car.uid == car_uid:
                return car
        return None

    def get(self):
        self.xsrf_token  # info: Вызывается, чтобы положить в куку xsrf_token - странно!
        username = self.get_argument("username", "")
        server = self.application.srv
        user = self.get_user(username=username)
        agent = user and self.get_agent(user)
        car_uid = self.get_argument("car_uid", None)
        car = car_uid and self.get_car(profile=agent.profile, car_uid=uuid.UUID(car_uid))
        if user and agent and car:
            self.render("adm/car_info.html", user=user, agent=agent.profile, server=server, car=car)
        else:
            self.send_error(404)

    def post(self):
        username = self.get_argument("username", "")
        user = self.get_user(username=username)
        if user is None:
            self.send_error(404)  # Ненайдено
            return
        if self.user_online(username=user.name):
            self.send_error(503,
                            reason="Agent Online. You should banned user for sometime.")  # Запрещено менять пользователей, которые онлайн
            return
        agent = user and self.get_agent(user)
        if agent is None:
            self.send_error(404, reason='Agent <{}> not found'.format(user.name))
            return

        car_uid = self.get_argument("car_uid", None)
        car = car_uid and self.get_car(profile=agent.profile, car_uid=uuid.UUID(car_uid))
        if car is None:
            self.send_error(404, reason='Car <{}> not found'.format(car_uid))
            return


        action = self.get_argument('action', '')

        self.finish('OK')
