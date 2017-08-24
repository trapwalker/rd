# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_common.handlers.base import FailWithoutAgentHandler


class MainMenuNucoilHandler(FailWithoutAgentHandler):
    def get(self):
        agent = self.agent

        if agent.car is None:
            log.warning('Agent {} cheating!!! MainMenuNucoilHandler without car'.format(agent))
            self.send_error(status_code=404)
            return
        self.render("main_menu_nucoil_window.html", car_id=agent.car.uid)
