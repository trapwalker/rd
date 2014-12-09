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
        log.info(u'ClientAPI: Добавление объекта')
        self.client.srv.addObject(**kw)

    @public_method
    def delObject(self, **kw):
        log.info(u'ClientAPI: Удаление объекта')
        self.client.srv.delObject(**kw)

    @public_method
    def changeObject(self, **kw):
        log.info(u'ClientAPI: Изменение объекта')
        self.client.srv.changeObject(**kw)

    @public_method
    def selectAreaByRect(self, **kw):
        log.info(u'ClientAPI: Запрос объектов в прямоугольной области')
        self.client.srv.selectAreaByRect(self.client, **kw)
        self.client.srv.getRectsByArea(self.client, **kw)