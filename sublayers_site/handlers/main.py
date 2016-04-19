# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)


from base import BaseHandler
from datetime import datetime

class MainHandler(BaseHandler):
    def get(self):
        user_name = self.get_current_user()
        self.render('main_page.html', user_name=user_name)