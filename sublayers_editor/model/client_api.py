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
    def addObject(self, **kw):
        log.info('ClientAPI: Add object')
        self.client.srv.addObject(**kw)

    @public_method
    def delObject(self, **kw):
        log.info('ClientAPI: Del object')
        self.client.srv.delObject(**kw)

    @public_method
    def changeObject(self, **kw):
        log.info('ClientAPI: Change object')
        self.client.srv.changeObject(**kw)

    @public_method
    def selectAreaByRect(self, **kw):
        log.info('ClientAPI: Select area by rect')
        self.client.srv.selectAreaByRect(self.client, **kw)
        self.client.srv.getRectsByArea(self.client, **kw)

    @public_method
    def intersectTest(self, **kw):
        log.info('ClientAPI: Intersect Test Request')
        self.client.srv.intersectTest(self.client, **kw)
