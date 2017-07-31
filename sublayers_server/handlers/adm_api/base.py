# -*- coding: utf-8 -*-
from __future__ import absolute_import
import logging

log = logging.getLogger(__name__)


from sublayers_common.handlers.base import AuthHandlerMixin
from sublayers_server import engine_server

from tornado.web import RequestHandler, HTTPError


LOCALHOST = frozenset(['localhost', '127.0.0.1', '::1', '185.58.205.29'])


class AdmAPIHandler(AuthHandlerMixin):
    _name_ = None

    def is_local_request(self):
        remote_ip = self.request.remote_ip
        return remote_ip in LOCALHOST  # or remote_ip == self.request.host

    def check_xsrf_cookie(self):
        """Disable checking XSRF for Adm API handlers"""
        if not self.is_local_request():
            log.warning('Call %s by %s from %s', self.classname, self.request.host, self.request.remote_ip)
            super(AdmAPIHandler, self).check_xsrf_cookie()

    def initialize(self, *av, **kw):
        super(AdmAPIHandler, self).initialize(*av, **kw)

    @property
    def command_name(self):
        return self._name_ or self.classname

    def prepare(self):
        if not self.is_local_request():
            log.warning(
                'Nonlocal Adm API call "%s" by "%s" from "%s" DENIED!',
                self.classname, self.request.host, self.request.remote_ip,
            )
            raise HTTPError(403)

        log.info('ADMIN:: %s', self.command_name)
