# -*- coding: utf-8 -*-

import logging

log = logging.getLogger(__name__)

from .base import BaseHandler


class MainMenuCharacterHandler(BaseHandler):
    def get(self):
        agent = self.application.srv.api.get_agent(self.current_user, make=False, do_disconnect=False)
        if agent is None:
            log.warning('Agent not found in database')
            self.send_error(status_code=404)
            return
        self.render("main_menu_character_window.html")
