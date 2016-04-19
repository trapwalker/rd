# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from base import BaseHandler
import tornado

from user_profile import User


class GetUserInfoHandler(BaseHandler):
    @tornado.gen.coroutine
    def post(self):
        user = self.get_current_user()
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


class GetUserInfoByIDHandler(BaseHandler):
    @tornado.gen.coroutine
    def post(self):
        user_id = self.get_argument('user_id', None)
        if user_id:
            user = User.get_by_id(db=self.db, id=user_id)
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