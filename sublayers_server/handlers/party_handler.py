# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_common.handlers.base import BaseHandler

from tornado.options import options


class MenuPartyHandler(BaseHandler):
    def get(self):
        if options.mode == 'basic':
            self.render("menu/party_window.html")
        elif options.mode == 'quick':
            self.render("menu/quick_mode_plug.html")
        else:
            self.send_error(status_code=404)
