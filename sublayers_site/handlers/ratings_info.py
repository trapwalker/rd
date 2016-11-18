# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_site.handlers.base_site import BaseSiteHandler
from sublayers_common.user_profile import User

import tornado.gen


def compare_function_for_traiders(a, b):
    return -1


def compare_function_for_looters(a, b):
    return -1


def compare_function_for_heroes(a, b):
    return -1


def compare_function_for_villain(a, b):
    return -1


def compare_function_for_leaders(a, b):
    return -1


def compare_function_for_warriors(a, b):
    return -1


def compare_function_for_adventurers(a, b):
    return -1




class GetRatingInfo(BaseSiteHandler):
    @tornado.gen.coroutine
    def post(self):
        rating_name = self.get_argument('rating_name', None)
        if rating_name is None:
            self.send_error(404)
            return
        cmp_func = None

        if rating_name == 'Traiders':
            cmp_func = compare_function_for_traiders
        elif rating_name == 'Looters':
            cmp_func = compare_function_for_looters
        elif rating_name == 'Heroes':
            cmp_func = compare_function_for_heroes
        elif rating_name == 'Villain':
            cmp_func = compare_function_for_villain
        elif rating_name == 'Leaders':
            cmp_func = compare_function_for_leaders
        elif rating_name == 'Warriors':
            cmp_func = compare_function_for_warriors
        elif rating_name == 'Adventurers':
            cmp_func = compare_function_for_adventurers

        # todo: принять в аргументе имя рейтинга и как-то обработтать это в поиске
        rate_users = yield User.objects.filter({'quick': False, 'registration_status': 'register'}).limit(50).find_all()
        # todo: load agents for all users
        # agent_exemplar = self.server.reg_agents.get([str(user._id)])

        if cmp_func:
            rate_users.sort(cmp=cmp_func)
        # print rate_users[0]
        # # todo: Вывод их через шаблон, + отправка их количества, чтобы можно было как-то обработать на клиенте
        self.render('table_ratings.html', rate_users=rate_users)


class GetQuickGameRecords(BaseSiteHandler):
    def post(self):
        # quick_users = self.application.db.quick_game_records.filter({'quick': True}).order_by('points', -1).limit(50).find_all()
        quick_users = self.application.db.quick_game_records.find().sort("points", -1).limit(50)
        # todo: Сделать метод в классе User для этого действия
        # quick_users = yield User.objects.filter({'quick': True}).order_by('time_quick_game', -1).limit(10).find_all()
        # todo: Вывод их через шаблон, + отправка их количества, чтобы можно было как-то обработать на клиенте
        self.render('table_ratings_quick_game.html', quick_users=quick_users)

