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
    RATING_SORT_FUNCTIONS = {
        'Traiders': compare_function_for_traiders,
        'Looters': compare_function_for_looters,
        'Heroes': compare_function_for_heroes,
        'Villain': compare_function_for_villain,
        'Leaders': compare_function_for_leaders,
        'Warriors': compare_function_for_warriors,
        'Adventurers': compare_function_for_adventurers,
    }

    def post(self):
        rating_name = self.get_argument('rating_name', None)
        if rating_name is None:
            self.send_error(404)
            return

        #cmp_func = self.RATING_SORT_FUNCTIONS.get(rating_name. None)

        # todo: принять в аргументе имя рейтинга и как-то обработтать это в поиске
        # todo: Сортировать рейтинг монго-запросом, а лучше хранить отсортированные рейтинги в статике или кешировать
        rate_users = User.objects.filter(quick=False, registration_status='register').limit(50).all()
        # todo: load agents for all users
        # agent_exemplar = self.server.reg_agents.get([str(user.pk)])

        # if cmp_func:
        #     rate_users.sort(cmp=cmp_func)

        # todo: Вывод их через шаблон, + отправка их количества, чтобы можно было как-то обработать на клиенте
        self.render('table_ratings.html', rate_users=rate_users)
        log.debug('GetRatingInfo(%s) render DONE: rating size is %d', rating_name, len(rate_users))


class GetQuickGameRecords(BaseSiteHandler):
    def post(self):
        quick_users = self.application.db.quick_game_records.find().sort("points", -1).limit(15)
        self.render('table_ratings_quick_game.html', quick_users=quick_users)

