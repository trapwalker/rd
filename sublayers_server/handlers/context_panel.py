# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from .base import BaseHandler


class ContextPanelLocationsHandler(BaseHandler):
    def get(self):
        agent = self.application.srv.api.get_agent(self.current_user, make=False, do_disconnect=False)
        if agent is None:
            log.warning('Agent not found in database')
            self.send_error(status_code=404)
            return
        self.render("context_panel/context_panel_locations_window.html")


class ContextPanelBarterSendHandler(BaseHandler):
    def get(self):
        agent = self.application.srv.api.get_agent(self.current_user, make=False, do_disconnect=False)
        # if agent is None:
        #     log.warning('Agent not found in database')
        #     self.send_error(status_code=404)
        #     return
        # container_id = self.get_argument("container_id")
        # container = None
        # if container_id:
        #     container = self.application.srv.objects.get(long(container_id))
        # if isinstance(container, POIContainer) and container.is_available(agent=agent):
        #     self.render("inventory_container_window.html", car_id=agent.api.car.uid, container_id=container_id)


class ContextPanelBarterInfoHandler(BaseHandler):
    def get(self):
        agent = self.application.srv.api.get_agent(self.current_user, make=False, do_disconnect=False)
        # if agent is None:
        #     log.warning('Agent not found in database')
        #     self.send_error(status_code=404)
        #     return
        # barter_id = long(self.get_argument("barter_id"))
        # barter = agent.get_barter_by_id(barter_id)
        # if (barter is None) or ((agent is not barter.initiator) and (agent is not barter.recipient)):
        #     log.warning('Agent has not access')
        #     self.send_error(status_code=404)
        #     return
        # my_table_id = None
        # other_table_id = None
        # if agent is barter.initiator:
        #     my_table_id = barter.initiator_table_obj.uid
        #     other_table_id = barter.recipient_table_obj.uid
        # else:
        #     my_table_id = barter.recipient_table_obj.uid
        #     other_table_id = barter.initiator_table_obj.uid
        # barter_name = '{} <=> {}'.format(barter.initiator.login, barter.recipient.login)
        # self.render("inventory_barter_window.html", agent=agent, car_id=agent.api.car.uid, barter=barter,
        #             my_table_id=my_table_id, other_table_id=other_table_id, barter_name=barter_name)


