# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.handlers.base import BaseHandler


class SiteHandler(BaseHandler):
    def get(self):
        self.render("site/index.html")
