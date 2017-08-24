# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

import tornado.web
from tornado.options import options
from bson.objectid import ObjectId, InvalidId
from mongoengine.queryset import DoesNotExist

from random import randint
from time import time

from sublayers_common.user_profile import User


def static_mobile_link_repr(link):
    return '{}'.format(
        #options.mobile_host, 
        link,
    )


def static_world_link_repr(link):
    search_str = 'static/'
    if link.startswith(search_str):
        return link[len(search_str):]
    else:
        log.warn('World link incorrect: %r', link)
        return ''


class TimeMeasuredHandler(tornado.web.RequestHandler):
    handlers_metrics = dict()

    @property
    def classname(self):
        return self.__class__.__name__

    def initialize(self):
        self._handler_start_time = None

    def prepare(self):
        self._handler_start_time = time()

    def on_finish(self):
        # print("{} processing time {}s".format(self.classname, round(time() - self._handler_start_time, 4)))
        self.on_timer_for_stat()

    def on_timer_for_stat(self):
        if not self._handler_start_time:
            return
        current_time = time()
        duration = round(current_time - self._handler_start_time, 4)
        cl_name = self.classname
        handlers_metrics = self.handlers_metrics
        metric = handlers_metrics.get(cl_name, None)

        if metric:
            metric["count"] += 1
            metric["duration"] += duration
            if metric["duration_max"] < duration or current_time - metric["duration_max_last_upd"] > 20.0:
                metric["duration_max"] = duration
                metric["duration_max_last_upd"] = current_time
                metric["event_perf_time_interval"].append(duration)
        else:
            handlers_metrics[cl_name] = {
                "name": cl_name,
                "count": 1,
                "duration": duration,
                "duration_max": duration,
                "duration_max_last_upd": current_time,
                "event_perf_time_interval": [duration]
            }
        self._handler_start_time = None


class AuthHandlerMixin(TimeMeasuredHandler):
    def get_current_user(self):
        user_id = self.get_secure_cookie("user")
        if not user_id:
            return

        # todo: cache users; invalidate cache by changes from site and quick server in teaching mode
        # todo: or isolate changes of site and teaching mode to separate documents
        try:
            return User.objects.get(id=ObjectId(user_id))
        except InvalidId as e:
            log.warning('Invalid user ID format %r: %s', user_id, e)
        except DoesNotExist as e:
            log.warning('User not found by ID %r: %s', user_id, e)


class BaseHandler(AuthHandlerMixin):
    def _quick_registration(self):
        qg_car_index = self.get_argument('qg_car_index', 0)
        nickname = self.get_argument('username', 'mobile_user')
        if self.current_user:
            quick_user = self.current_user if self.current_user.quick else None
            if quick_user and quick_user.name == nickname:
                quick_user.car_index = qg_car_index
                quick_user.save()
                self.finish({'status': 'Такой пользователь существует'})
                return

        if not nickname or (len(nickname) > 100):  # todo: Вынести лимиты в константы
            # self.finish({'status': 'Некорректные входные данные'})
            self.send_error(403)
            return

        # todo: Проверять введенный username, а, если занят, предлагать рандомизированный пока не будет введен
        # укниальный среди быстрых игроков.
        login_free = False
        email = ''
        password = str(randint(0,999999))  # TODO: WTF?! remove fake password!
        username = nickname + str(randint(0,999999))
        while not login_free:
            email = username + '@' + username  # todo: Предотвратить заполнение email заведомо ложной информацией
            # todo: ##OPTIMIZE получать это одним запросом к монге через $or
            login_free = (User.get_by_email(email=email) is None and User.get_by_name(name=username) is None)
            if not login_free:
                username = nickname + str(randint(0, 999999))

        user = User(name=username, email=email, raw_password=password, car_index=qg_car_index, quick=True)
        result = user.save()
        from sublayers_site.handlers.site_auth import clear_all_cookie  # todo: ##REFACTORING
        clear_all_cookie(self)
        self.set_secure_cookie("user", str(user.id))

    def get_template_namespace(self):
        namespace = super(BaseHandler, self).get_template_namespace()
        namespace.update(
            revision=self.application.revision,
            version=self.application.version,
            static_world_link_repr=static_world_link_repr,
            static_mobile_link_repr=static_mobile_link_repr,
        )
        return namespace


class FailUnauthorizedHandler(BaseHandler):
    def prepare(self):
        super(FailUnauthorizedHandler, self).prepare()
        user = self.current_user
        user_id = self.get_secure_cookie("user")
        if user is None:
            log.warning('Unauthorized call of %s by user %r', self.__class__.__name__, user_id)
            raise tornado.web.HTTPError(403)


class FailWithoutAgentHandler(FailUnauthorizedHandler):
    """"Abstract handler class that fails if agent of user is not found"""
    def prepare(self):
        super(FailWithoutAgentHandler, self).prepare()
        user = self.current_user
        self.agent = agent = self.application.srv.api.get_agent(user, make=False, do_disconnect=False)
        if agent is None:
            log.warning('Agent of user %s is not found in database', user)
            self.send_error(status_code=404, reason='Agent is not found')
