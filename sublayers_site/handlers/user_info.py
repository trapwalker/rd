# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_site.handlers.base_site import BaseSiteHandler
from sublayers_common.user_profile import User

from bson.objectid import ObjectId, InvalidId
from time import mktime
import datetime


class GetUserInfoHandler(BaseSiteHandler):
    def post(self):
        user = self.current_user
        user_info = dict()
        if user is None:
            self.finish({'user_status': 'not_register'})
            return

        if user.quick:
            self.finish({'user_status': 'quick_user', 'user_name': user.name})
            return

        user_info = self._get_car(user=user)
        agent_info = user_info.get('user_info', dict())

        created = None
        if user.date_created is None:
            user.date_created = datetime.datetime.now()
            user.save()
            log.warn('User dont have date_created. Setup now Date')

        created = mktime(user.date_created.timetuple()) * 1000

        self.finish({
            'user_status': user.registration_status,
            'user_name': user.name,
            'user_car_html': user_info.get('html_car_img', ''),
            'user_info_html': user_info.get('html_agent', ''),
            'user_balance': agent_info.get('balance', 0),
            'position': agent_info.get('position', 0),
            'ordinal_number': user.ordinal_number,
            'created': created,
            'avatar_link': user.avatar_link,
            'is_tester': user.is_tester,
        })


class GetUserInfoByIDHandler(BaseSiteHandler):
    def post(self):
        user_id = self.get_argument('user_id', None)
        if user_id:
            user = None
            try:
                user = User.objects.get(ObjectId(user_id))
            except InvalidId as e:
                log.warning('User resolve error: %r', e)
            if user:
                if user.quick:
                    self.finish({
                        'user_name': user.name,
                    })
                else:
                    user_info = yield self._get_car(user=user)
                    self.finish({
                        'user_name': user.name,
                        'user_car_html': user_info.get('html_car_img', ''),
                        'user_info_html': user_info.get('html_agent', ''),
                    })
            else:
                self.send_error(404)
        else:
            self.send_error(404)
