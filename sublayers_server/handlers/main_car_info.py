# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from .base import BaseHandler

class MainCarInfoHandler(BaseHandler):
    def get(self):
        agent = self.application.srv.api.get_agent(self.current_user, make=False, do_disconnect=False)
        if agent is None:
            log.warning('Agent not found in database')
            self.send_error(status_code=404)
            return
        self.render("main_car_info_window.html", car=agent.example.car)


class PersonInfoHandler(BaseHandler):
    def get(self):
        agent = self.application.srv.api.get_agent(self.current_user, make=False, do_disconnect=False)
        person_name = self.get_argument('person', default=None)
        person = None
        if person_name:
            log.debug('Person Name is %s', person_name)
            person = self.application.srv.agents.get(person_name, None)
        if agent is None or person is None:
            log.warning('Agent not found in database')
            self.send_error(status_code=404)
            return
        self.render("person_info_chat.html", agent=person)