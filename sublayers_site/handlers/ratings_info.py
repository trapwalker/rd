# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from base import BaseHandler
from user_profile import User

import tornado.gen

class GetRatingInfo(BaseHandler):
    @tornado.gen.coroutine
    def post(self):
        # todo: принять в аргументе имя рейтинга и как-то обработтать это в поиске
        rate_users = yield User.objects.filter({'quick': False}).limit(10).find_all()
        # # todo: Вывод их через шаблон, + отправка их количества, чтобы можно было как-то обработать на клиенте
        self.render('table_ratings.html', rate_users=rate_users)


class GetQuickGameRecords(BaseHandler):
    @tornado.gen.coroutine
    def post(self):
        # todo: Сделать метод в классе User для этого действия
        quick_users = yield User.objects.filter({'quick': True}).order_by('time_quick_game', -1).limit(10).find_all()
        # todo: Вывод их через шаблон, + отправка их количества, чтобы можно было как-то обработать на клиенте
        self.render('table_ratings_quick_game.html', quick_users=quick_users)
