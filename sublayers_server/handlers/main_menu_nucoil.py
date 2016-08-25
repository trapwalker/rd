# -*- coding: utf-8 -*-

import logging

log = logging.getLogger(__name__)

import tornado.gen

from sublayers_common.handlers.base import BaseHandler


class MainMenuNucoilHandler(BaseHandler):
    @tornado.gen.coroutine
    def get(self):
        agent = yield self.application.srv.api.get_agent(self.current_user, make=False, do_disconnect=False)
        if agent is None:
            log.warning('Agent not found in database')
            self.send_error(status_code=404)
            return
        self.render("main_menu_nucoil_window.html", car_id=agent.api.car.uid)
