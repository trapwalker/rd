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
        from datetime import datetime
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

        str_date_template = "%d.%m.%Y"
        for news in news_list:
            iso_date = datetime.strptime(news['date'], str_date_template).date()
            news['iso_date'] = iso_date
            news['iso_date_str'] = str(iso_date)

        self.news_list = news_list
        self.sort_news_by_date()
        # Добавить колл-бек на обновление новостей
        tornado.ioloop.IOLoop.current().call_later(delay=600, callback=self.refresh_news)

    def sort_news_by_date(self):
        def compare_news_date(news1, news2):
            cmp = news1['iso_date'] > news2['iso_date']
            return -1 if cmp else 1
        self.news_list.sort(cmp=compare_news_date)

    def news_by_locale(self, locale):
        news = []
        for new_rec in self.news_list:
            header = new_rec.get('header', None)
            content = new_rec.get('content', None)
            if header:
                header = header.get(locale, None)
            if content:
                content = content.get(locale, None)
            if header and content:
                news.append(
                    dict(
                        header=header,
                        content=content,
                        iso_date_str=new_rec['iso_date_str'],
                        link=new_rec['link'],
                        date=new_rec['date'],
                    )
                )
        return news