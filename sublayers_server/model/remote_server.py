# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from .event_machine import Server


class RemoteServer(Server):

    def __init__(self, uri, **kw):
        super(RemoteServer, self).__init__(**kw)
        self.uri = uri
