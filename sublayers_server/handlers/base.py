# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.user_profile import User

import tornado.web


class AuthHandlerMixin(tornado.web.RequestHandler):
    @property
    def db(self):
        return self.application.db

    def get_current_user(self):
        '''Use `current_user` property in handlers'''
        user_id = self.get_secure_cookie("user")
        if not user_id:
            return

        user = User.get_by_id(self.db, user_id)
        log.debug('AuthHandlerMixin.get_current_user({!r}): {}'.format(self, user))
        return user


class BaseHandler(AuthHandlerMixin):
    def get_template_namespace(self):
        namespace = super(BaseHandler, self).get_template_namespace()
        namespace.update(
            revision=self.application.revision,
        )
        return namespace
