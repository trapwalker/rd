# -*- coding: utf-8 -*-
from __future__ import absolute_import


from sublayers_server.handlers.adm_api.base import AdmAPIHandler

import json
from bson.objectid import ObjectId


class JSONEncoder(json.JSONEncoder):
    def __init__(self, ensure_ascii=False, sort_keys=True, indent=2, **kw):
        super(JSONEncoder, self).__init__(ensure_ascii=ensure_ascii, sort_keys=sort_keys, indent=indent, **kw)

    def default(self, o):
        if isinstance(o, ObjectId):
            return str(o)
        return json.JSONEncoder.default(self, o)


class ServerSaveHandler(AdmAPIHandler):
    _name_ = 'server.save'
    def post(self, *args, **kwargs):
        res = self.application.srv.flash_save()
        self.write(JSONEncoder().encode(res))


class ServerShutdownHandler(AdmAPIHandler):
    _name_ = 'server.shutdown'
    def post(self, *args, **kwargs):
        self.application.stop()
