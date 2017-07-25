# -*- coding: utf-8 -*-
from __future__ import absolute_import


from sublayers_server.handlers.adm_api.base import AdmAPIHandler


class ServerSaveHandler(AdmAPIHandler):
    _name_ = 'server.save'
    def post(self, *args, **kwargs):
        self.application.srv.flash_save()


class ServerShutdownHandler(AdmAPIHandler):
    _name_ = 'server.shutdown'
    def post(self, *args, **kwargs):
        self.application.stop()
