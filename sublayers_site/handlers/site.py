# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from base import BaseHandler
import os
import yaml
import tornado


class SiteMainHandler(BaseHandler):
    # todo: снести и изменить в шаблоне!
    @classmethod
    def new_site_angle_type(cls):
        return 1

    @tornado.gen.coroutine
    def get(self):

        # Подготовка списка новостей
        news_list = []
        serv_dir = os.getcwd()
        os.chdir('static_site')
        os.chdir('news')
        for news_file_name in filter(lambda x: x.endswith('.yaml'), os.listdir('.')):
            news_file = open(news_file_name, 'r')
            news_list.append(yaml.load(news_file))
            news_file.close()
        os.chdir(serv_dir)

        # Определяем, авторизованы ли мы
        is_authorize = True if self.current_user and not self.current_user.is_quick_user else False
        is_authorize_str = 'true' if is_authorize else 'false'

        # Загружаем информацию о быстрой игре
        quick_game_info = yield self._get_quick_game()

        self.render('site_main.html', news_list=news_list, site_angle_number=self.new_site_angle_type(),
                    is_authorize=is_authorize_str, quick_game_cars=quick_game_info.get('quick_cars', []))


