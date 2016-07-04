# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

import os
import yaml

from tornado.options import options
import tornado.ioloop


class NewsManager(object):
    def __init__(self):
        self.news_list = []
        self.refresh_news()

    def refresh_news(self):
        # Обновить новости
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

        self.news_list = news_list
        self.sort_news_by_date()
        # Добавить колл-бек на обновление новостей
        tornado.ioloop.IOLoop.current().call_later(delay=600, callback=self.refresh_news)

    def sort_news_by_date(self):
        from datetime import datetime
        str_date_template = "%d.%m.%Y"
        def compare_news_date(news1, news2):
            cmp = datetime.strptime(news1['date'], str_date_template).date() > datetime.strptime(news2['date'], str_date_template).date()
            return -1 if cmp else 1
        self.news_list.sort(cmp=compare_news_date)
