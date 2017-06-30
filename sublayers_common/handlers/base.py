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
    return 'http://{}{}'.format(options.mobile_host, link)


def static_world_link_repr(link):
    search_str = 'static/'
    if link.startswith(search_str):
        return link[len(search_str):]
    else:
        log.warn('World link incorrect: %r', link)
        return ''


class AuthHandlerMixin(tornado.web.RequestHandler):
    def prepare(self):
        self._handler_start_time = time()
        user = None
        user_id = self.get_secure_cookie("user")
        if user_id:
            try:
                user = User.objects.get(id=ObjectId(user_id))
            except InvalidId as e:
                log.warning('Invalid user ID format: %r', e)
            except DoesNotExist as e:
                log.warning('User not found by ID %r: %r', user_id, e)

        self.current_user = user


    def on_finish(self):
        # print("{} processing time {}s".format(self.classname, round(time() - self._handler_start_time, 4)))
        self.on_timer_for_stat()

    def on_timer_for_stat(self):
        if not self._handler_start_time:
            return
        current_time = time()
        duration = round(current_time - self._handler_start_time, 4)
        cl_name = self.classname
        if self.handlers_metrics.get(cl_name, None):
            self.handlers_metrics[cl_name]["count"] += 1
            self.handlers_metrics[cl_name]["duration"] += duration
            if self.handlers_metrics[cl_name]["duration_max"] < duration or current_time - self.handlers_metrics[cl_name]["duration_max_last_upd"] > 20.0:
                self.handlers_metrics[cl_name]["duration_max"] = duration
                self.handlers_metrics[cl_name]["duration_max_last_upd"] = current_time

                self.handlers_metrics[cl_name]["event_perf_time_interval"].append(duration)
        else:
            self.handlers_metrics[cl_name] = {
                "name": cl_name,
                "count": 1,
                "duration": duration,
                "duration_max": duration,
                "duration_max_last_upd": current_time,

                "event_perf_time_interval": [duration]
            }
        self._handler_start_time = None

    @property
    def classname(self):
        return self.__class__.__name__

    handlers_metrics = dict()


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
        password = str(randint(0,999999))
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
