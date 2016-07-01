# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_common.handlers.base import BaseHandler


class ContextPanelListHandler(BaseHandler):
    def get(self):
        self.render("context_panel/context_list_window.html")