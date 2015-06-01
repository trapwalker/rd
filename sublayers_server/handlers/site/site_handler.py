# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from handlers.base import BaseHandler


class SiteHandler(BaseHandler):
    def get(self):
        self.render("site\index.html")
