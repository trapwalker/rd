# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_common.handlers.base import BaseHandler, FailWithoutAgentHandler
from sublayers_server.model.poi_loot_objects import POICorpse


class MenuCarHandler(BaseHandler):
    # todo: Может быть нужно унаследоваться от абстректного хендлера, падающего без авторизации?
    def get(self):
        if self.current_user:
            agent = self.application.srv.agents.get(str(self.current_user.pk), None)
            if not agent or not agent.example.profile.car:
                return
            else:
                agent.log.info('open car_window')
        else:
            return
        self.set_header("Access-Control-Allow-Origin", "*")
        self.render("menu/car_window.html", car=agent.example.profile.car)


# todo: скорее всего не используется
class MainCarInfoHandler(FailWithoutAgentHandler):
    def get(self):
        self.render("main_car_info_window.html", car=self.agent.example.profile.car)


class PersonInfoHandler(FailWithoutAgentHandler):
    def get(self):
        # Параметр mode: 'map' окно на карте, 'city' окно в городе
        agent = self.agent
        mode = self.get_argument('mode', 'city')
        person_name = self.get_argument('person', default=None)
        person = None
        if person_name:
            # log.debug('Person Name is %s', person_name)
            person = self.application.srv.agents_by_name.get(str(person_name), None)

        if person is None:
            log.warning('Person %r is not found online', person_name)
            self.send_error(status_code=404)
            return

        agent.log.info('open PersonInfoHandler for person_name={}'.format(person_name))
        # print('open PersonInfoHandler for person_name={}'.format(person_name))
        if mode == 'city':
            self.render("person_info_chat.html", agent=person)
        elif mode == 'map':
            lvl, (nxt_lvl, nxt_lvl_exp), rest_exp = person.example.profile.exp_table.by_exp(exp=person.example.profile.exp)
            car = None if person.car is None else person.car.example
            target_agent_locale = agent.get_lang()
            self.render("menu/person_window.html", agent=person, lvl=lvl, car=car, target_agent_locale=target_agent_locale)


class PersonInfoCorpseHandler(FailWithoutAgentHandler):
    def get(self):
        agent = self.agent
        container_id = self.get_argument("container_id")
        container = None
        if container_id:
            container = self.application.srv.objects.get(container_id)
        if container is None or not isinstance(container, POICorpse) or not container.agent_donor:
            self.send_error(status_code=404)
            return
        person = container.agent_donor
        car = container.donor_car
        # print('open PersonInfoCorpseHandler for person={}'.format(person))
        agent.log.info('open PersonInfoCorpseHandler for person={}'.format(person))
        lvl, (nxt_lvl, nxt_lvl_exp), rest_exp = person.example.profile.exp_table.by_exp(exp=person.example.profile.exp)
        target_agent_locale = agent.get_lang()
        self.render("menu/person_window.html", agent=person, lvl=lvl, car=car, target_agent_locale=target_agent_locale)
