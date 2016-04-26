# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from .base import BaseHandler
from sublayers_server.model.party import Party


class PartyHandler(BaseHandler):
    def get(self):
        agent = self.application.srv.api.get_agent(self.current_user, make=False, do_disconnect=False)
        if agent is None:
            log.warning('Agent not found in database')
            self.send_error(status_code=404)
            return
        page_type = self.get_argument("page_type")
        data = dict()
        if page_type == 'party_info':
            data.update(party=Party.search(name=self.get_argument("party_name")))
        if page_type == 'party':
            data.update(party=agent.party)
        if agent:
            self.render("party/" + page_type  + "_window.html", agent=agent, data=data)
