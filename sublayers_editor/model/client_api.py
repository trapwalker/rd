# -*- coding: utf-8 -*-

import logging

log = logging.getLogger(__name__)
log.__class__.__call__ = log.__class__.info

from api_tools import API, public_method

class ClientAPI(API):
    def __init__(self, client):
        super(ClientAPI, self).__init__()
        self.client = client

    @public_method
    def stop(self):
        pass

