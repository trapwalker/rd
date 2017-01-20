# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

import tornado.gen

from sublayers_common.handlers.base import BaseHandler


class MenuCarHandler(BaseHandler):
    def get(self):
        if self.current_user:
            agent = self.application.srv.agents.get(str(self.current_user._id), None)
            if agent:
                agent.logging_agent('open car_window')
        self.set_header("Access-Control-Allow-Origin", "*")
        self.render("menu/car_window.html")


# todo: скорее всего не используется
class MainCarInfoHandler(BaseHandler):
    @tornado.gen.coroutine
    def get(self):
        agent = yield self.application.srv.api.get_agent(self.current_user, make=False, do_disconnect=False)
        if agent is None:
            log.warning('Agent not found in database')
            self.send_error(status_code=404)
            return
        self.render("main_car_info_window.html", car=agent.example.car)


class PersonInfoHandler(BaseHandler):
    @tornado.gen.coroutine
    def get(self):
        # Параметр mode: 'map' окно на карте, 'city' окно в городе
        mode = self.get_argument('mode', 'city')
        person_name = self.get_argument('person', default=None)
        agent = yield self.application.srv.api.get_agent(self.current_user, make=False, do_disconnect=False)
        person = None
        if person_name:
            # log.debug('Person Name is %s', person_name)
            person = self.application.srv.agents_by_name.get(str(person_name), None)
        if agent is None or person is None:
            log.warning('Agent not found in database')
            self.send_error(status_code=404)
            return
        agent.logging_agent('open PersonInfoHandler for person_name={}'.format(person_name))
        if mode == 'city':
            self.render("person_info_chat.html", agent=person)
        elif mode == 'map':
            lvl, (nxt_lvl, nxt_lvl_exp), rest_exp = person.example.exp_table.by_exp(exp=agent.example.exp)
            self.render("menu/person_window.html", agent=person, lvl=lvl)