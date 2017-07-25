# -*- coding: utf-8 -*-
from __future__ import absolute_import
import logging

log = logging.getLogger(__name__)


from sublayers_common.handlers.base import AuthHandlerMixin
from sublayers_server import engine_server

from tornado.web import RequestHandler


class AdmAPIHandler(AuthHandlerMixin):
    _name_ = None

    def check_xsrf_cookie(self):
        """Disable checking XSRF for Adm API handlers"""
        pass

    def initialize(self, *av, **kw):
        super(AdmAPIHandler, self).initialize(*av, **kw)

    @property
    def command_name(self):
        return self._name_ or self.classname

    def prepare(self):
        log.info('ADMIN:: %s', self.command_name)
