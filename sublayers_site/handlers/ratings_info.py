# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_site.handlers.base_site import BaseSiteHandler
from sublayers_common.user_profile import User


#todo: ##REFACTORING
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
    def post(self):
        rating_name = self.get_argument('rating_name', None)
        if rating_name is None:
            self.send_error(404)
            return
        cmp_func = None

        log.debug('GetRatingInfo: %s', rating_name)

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
        rate_users = User.objects.filter(quick=False, registration_status='register').limit(50).find_all()
        # todo: load agents for all users
        # agent_exemplar = self.server.reg_agents.get([user.pk])

        log.debug('GetRatingInfo len of rate_users: %s', len(rate_users))

        if cmp_func:
            rate_users.sort(cmp=cmp_func)

        log.debug('GetRatingInfo sorting done')
        # todo: Вывод их через шаблон, + отправка их количества, чтобы можно было как-то обработать на клиенте
        self.render('table_ratings.html', rate_users=rate_users)
        log.debug('GetRatingInfo render done')


class GetQuickGameRecords(BaseSiteHandler):
    def post(self):
        quick_users = self.application.db.quick_game_records.find().sort("points", -1).limit(15)
        self.render('table_ratings_quick_game.html', quick_users=quick_users)

