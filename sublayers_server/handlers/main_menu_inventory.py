# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from .base import BaseHandler

from sublayers_server.model.units import POIContainer


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
        barter_id = self.get_argument("barter_id")
        barter = agent.get_barter_by_id(barter_id)
        self.render("inventory_barter_window.html", car_id=agent.api.car.uid)


