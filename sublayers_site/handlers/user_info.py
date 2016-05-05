# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_site.handlers.base_site import BaseSiteHandler
from sublayers_common.user_profile import User

from bson.objectid import ObjectId, InvalidId
import tornado

from time import mktime
import datetime


class GetUserInfoHandler(BaseSiteHandler):
    @tornado.gen.coroutine
    def post(self):
        user = self.current_user
        user_info = dict()
        if user:
            user_info = yield self._get_car(username=user.name)
        agent_info = user_info.get('user_info', dict())

        created = None
        if user:
            if user.date_created is not None:
                created = mktime(user.date_created.timetuple()) * 1000
            else:
                user.date_created = datetime.datetime.now()
                yield user.save()
                created = 0
                log.warn('User dont have date_created. Setup now Date')

        self.finish({
            'user_status': 'not_register' if user is None else user.registration_status,
            'user_name': '' if user is None else user.name,
            'user_car_html': user_info.get('html_car_img', ''),
            'user_info_html': user_info.get('html_agent', ''),
            'user_balance': agent_info.get('balance', 0),
            'position': agent_info.get('position', 0),
            'ordinal_number': None if user is None else user.ordinal_number,
            'created': created,
            'avatar_link': None if user is None else user.avatar_link,
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
