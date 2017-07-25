# -*- coding: utf-8 -*-
from __future__ import absolute_import


from sublayers_server.handlers.adm_api.base import AdmAPIHandler


class ServerSaveHandler(AdmAPIHandler):
    __name = 'server.save'
    def post(self, *args, **kwargs):
        self.application.srv.flash_save()


class ServerShutdownHandler(AdmAPIHandler):
    __name = 'server.shutdown'
    def post(self, *args, **kwargs):
        self.application.stop()
