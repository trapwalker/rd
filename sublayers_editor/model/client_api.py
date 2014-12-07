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
    def addObject(self, coord, object_type):
        log.info(u'Добавление объекта')

    @public_method
    def delObject(self, coord, object_type):
        log.info(u'Удаление объекта')

    @public_method
    def changeObject(self, coord, object_type):
        log.info(u'Изменение объекта')