# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_common.user_profile import User

import tornado.web
import tornado.gen
from bson.objectid import ObjectId, InvalidId


def static_world_link_repr(link):
    search_str = 'static/'
    assert link.startswith(search_str)
    return link[len(search_str):]


class AuthHandlerMixin(tornado.web.RequestHandler):
    @tornado.gen.coroutine
    def prepare(self):
        user = None
        user_id = self.get_secure_cookie("user")
        if user_id:
            try:
                user = yield User.objects.get(ObjectId(user_id))
            except InvalidId as e:
                log.warning('User resolve error: %r', e)

        self.current_user = user


class BaseHandler(AuthHandlerMixin):
    def get_template_namespace(self):
        namespace = super(BaseHandler, self).get_template_namespace()
        namespace.update(
            revision=self.application.revision,
            version=self.application.version,
            static_world_link_repr=static_world_link_repr,
        )
        return namespace


