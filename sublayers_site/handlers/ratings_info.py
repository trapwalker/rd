# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from base import BaseHandler
from user_profile import User


class GetRatingInfo(BaseHandler):
    def post(self):
        rating_name = self.get_argument('rating_name', '')
        db = self.application.db
        # todo: проверить, существует ли такой рейтинг
        # Запрос к базе и получение списка пользователей
        rate_users = []
        # todo: перевести на асинхронный запрос
        rate_users = list(db[User.__collection__].find(
            {"quick": False},
            {'name': 1, '_id': 1}
        ).limit(10))

        # todo: Вывод их через шаблон, + отправка их количества, чтобы можно было как-то обработать на клиенте
        self.render('table_ratings.html', rate_users=rate_users)


class GetQuickGameRecords(BaseHandler):
    def post(self):
        # Запрос к базе и получение списка пользователей
        quick_users = []
        db = self.application.db
        # todo: перевести на асинхронный запрос
        quick_users = list(db[User.__collection__].find(
            {"quick": True},
            {'name': 1, 'time_quick_game': 1}
        ).sort(
            'time_quick_game', -1
        ).limit(10))
        # log.info(quick_users)
        # log.info(len(quick_users))
        # for rec in quick_users:
        #     log.info(rec.get('time_quick_game', None))
        # todo: Вывод их через шаблон, + отправка их количества, чтобы можно было как-то обработать на клиенте
        self.render('table_ratings_quick_game.html', quick_users=quick_users)