# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_common.handlers.base import BaseHandler
from sublayers_server.model.poi_loot_objects import POIContainer
from sublayers_server.model.barter import Barter


class MainInventoryHandler(BaseHandler):
    def get(self):
        agent = self.application.srv.api.get_agent(self.current_user, make=False, do_disconnect=False)
        if agent is None:
            log.warning('Agent not found in database')
            self.send_error(status_code=404)
            return
        self.render("inventory_info_window.html", car_id=agent.api.car.uid, car=agent.api.car)


class ContainerInventoryHandler(BaseHandler):
    def get(self):
        agent = self.application.srv.api.get_agent(self.current_user, make=False, do_disconnect=False)
        if agent is None:
            log.warning('Agent not found in database')
            self.send_error(status_code=404)
            return
        container_id = self.get_argument("container_id")
        container = None
        if container_id:
            container = self.application.srv.objects.get(long(container_id))
        if isinstance(container, POIContainer) and container.is_available(agent=agent):
            self.render("inventory_container_window.html", car_id=agent.api.car.uid, container_id=container_id)


class BarterInventoryHandler(BaseHandler):
    def get(self):
        agent = self.application.srv.api.get_agent(self.current_user, make=False, do_disconnect=False)
        if agent is None:
            log.warning('Agent not found in database')
            self.send_error(status_code=404)
            return
        barter_id = long(self.get_argument("barter_id"))

        barter = Barter.get_barter(barter_id=barter_id, agent=agent)
        if (barter is None) or ((agent is not barter.initiator) and (agent is not barter.recipient)):
            log.warning('Agent has not access')
            self.send_error(status_code=404)
            return
        my_table_id = None
        other_table_id = None
        if agent is barter.initiator:
            my_table_id = barter.initiator_table_obj.uid
            other_table_id = barter.recipient_table_obj.uid
        else:
            my_table_id = barter.recipient_table_obj.uid
            other_table_id = barter.initiator_table_obj.uid
        barter_name = '{!r} <=> {!r}'.format(barter.initiator.user.name, barter.recipient.user.name)  # todo: use unicode
        self.render("inventory_barter_window.html", agent=agent, car_id=agent.api.car.uid, barter=barter,
                    my_table_id=my_table_id, other_table_id=other_table_id, barter_name=barter_name)
