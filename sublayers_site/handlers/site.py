# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_site.handlers.base_site import BaseSiteHandler

import os
import yaml
import tornado

from tornado.options import options
from sublayers_common.user_profile import User


class SiteMainHandler(BaseSiteHandler):
    @tornado.gen.coroutine
    def get(self):
        # Подготовка списка новостей
        news_list = []
        serv_dir = os.getcwd()

        os.chdir(options.static_path)
        os.chdir('static_site')
        os.chdir('news')
        for news_file_name in filter(lambda x: x.endswith('.yaml'), os.listdir('.')):
            news_file = open(news_file_name, 'r')
            news_list.append(yaml.load(news_file))
            news_file.close()
        os.chdir(serv_dir)

        # Узнать количество пользователей (онлайн пока не делаем, так как не хотим делать запрос к серверу)
        users_count = yield User.objects.count()

        # Загружаем информацию о быстрой игре
        quick_game_info = self._get_quick_game()

        self.render('site_main.html', news_list=news_list, quick_game_cars=quick_game_info.get('quick_cars', []),
                    all_users_registered=users_count)
