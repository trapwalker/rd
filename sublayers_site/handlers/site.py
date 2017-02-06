# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_site.handlers.base_site import BaseSiteHandler

import os
import yaml
import tornado

from tornado.options import options
from sublayers_common.user_profile import User
from sublayers_site.site_locale import locale, locale_objects
from sublayers_site.handlers.site_auth import get_forum_cookie_str


class SiteMainHandler(BaseSiteHandler):
    @tornado.gen.coroutine
    def get(self):
        self.xsrf_token  # info: Вызывается, чтобы положить в куку xsrf_token - странно!
        # Подготовка списка новостей
        news_list = self.application.news_manager.news_by_locale(locale=self.user_lang)
        # Узнать количество пользователей (онлайн пока не делаем, так как не хотим делать запрос к серверу)
        users_count = yield User.objects.count()

        # Загружаем информацию о быстрой игре
        quick_game_info = self._get_quick_game()

        if self.current_user:
            self.set_cookie("forum_user", get_forum_cookie_str(self.current_user.name))

        self.render('site_main.html', news_list=news_list, quick_game_cars=quick_game_info.get('quick_cars', []),
                    all_users_registered=users_count, user_lang=self.user_lang)


class GetUserLocaleJSONHandler(BaseSiteHandler):
    def get(self):
        if locale_objects.get(self.user_lang, None):
            self.finish(locale_objects[self.user_lang])
        else:
            self.send_error(status_code=404)