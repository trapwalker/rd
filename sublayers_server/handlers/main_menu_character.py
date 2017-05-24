# -*- coding: utf-8 -*-

import logging

log = logging.getLogger(__name__)

from sublayers_common.handlers.base import BaseHandler


class MenuCharacterHandler(BaseHandler):
    def get(self):
        if self.current_user:
            agent = self.application.srv.agents.get(self.current_user.pk, None)
            if agent:
                agent.log.info('open character_window')
        self.render("menu/character_window.html")