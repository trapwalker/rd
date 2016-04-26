# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_site.handlers.base_site import BaseHandler


class GetAudioTest(BaseHandler):
    def get(self):
        self.render('audio_test.html')
