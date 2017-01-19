# -*- coding: utf-8 -*-

import logging

log = logging.getLogger(__name__)

from sublayers_common.handlers.base import BaseHandler


class MenuCharacterHandler(BaseHandler):
    def get(self):
        if self.current_user:
            agent = self.application.srv.agents.get(str(self.current_user._id), None)
            if agent:
                agent.logging_agent('open character_window')
        self.render("menu/character_window.html")