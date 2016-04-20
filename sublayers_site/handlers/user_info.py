# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_site.handlers.base_site import BaseSiteHandler
from sublayers_common.user_profile import User

from bson.objectid import ObjectId, InvalidId
import tornado


class GetUserInfoHandler(BaseSiteHandler):
    @tornado.gen.coroutine
    def post(self):
        user = self.current_user
        user_info = dict()
        if user:
            user_info = yield self._get_car(username=user.name)
        agent_info = user_info.get('user_info', dict())

        self.finish({
            'is_authorize': user is not None,
            'user_name': '' if user is None else user.name,
            'user_car_html': user_info.get('html_car_img', ''),
            'user_info_html': user_info.get('html_agent', ''),
            'user_balance': agent_info.get('balance', 0),
            'position': agent_info.get('position', 0),
        })


class GetUserInfoByIDHandler(BaseSiteHandler):
    @tornado.gen.coroutine
    def post(self):
        user_id = self.get_argument('user_id', None)
        if user_id:
            user = None
            try:
                user = yield User.objects.get(ObjectId(user_id))
            except InvalidId as e:
                log.warning('User resolve error: %r', e)
            if user:
                user_info = yield self._get_car(username=user.name)
                self.finish({
                    'user_name': user.name,
                    'user_car_html': user_info.get('html_car_img', ''),
                    'user_info_html': user_info.get('html_agent', ''),
                })
            else:
                self.send_error(404)
        else:
            self.send_error(404)
