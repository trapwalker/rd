# -*- coding: utf-8 -*-

import logging

log = logging.getLogger(__name__)

from .base import BaseHandler


class MainMenuNucoilHandler(BaseHandler):
    def get(self):
        agent = self.application.srv.api.get_agent(self.current_user, make=False, do_disconnect=False)
        self.render("main_menu_nucoil_window.html", car_id=agent.api.car.uid)
