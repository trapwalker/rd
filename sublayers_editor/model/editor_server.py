# -*- coding: utf-8 -*-

import logging.config
log = logging.getLogger(__name__)


class EditorServer(object):

    def __init__(self, app, uid=None):
        self.app = app

