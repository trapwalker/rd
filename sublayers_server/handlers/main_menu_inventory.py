# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

import tornado.gen

from sublayers_common.handlers.base import BaseHandler
from sublayers_server.model.poi_loot_objects import POIContainer
from sublayers_server.model.barter import Barter


class MainInventoryHandler(BaseHandler):
    @tornado.gen.coroutine
    def get(self):
        agent = yield self.application.srv.api.get_agent(self.current_user, make=False, do_disconnect=False)
        if agent is None:
            log.warning('Agent not found in database')
            self.send_error(status_code=404)
            return
        agent.log.info('open inventory_info_window car_id={}'.format(agent.api.car.uid))
        self.render("inventory_info_window.html", car_id=agent.api.car.uid, car=agent.api.car)


class ContainerInventoryHandler(BaseHandler):
    @tornado.gen.coroutine
    def get(self):
        agent = yield self.application.srv.api.get_agent(self.current_user, make=False, do_disconnect=False)
        if agent is None:
            log.warning('Agent not found in database')
            self.send_error(status_code=404)
            return
        container_id = self.get_argument("container_id")
        container = None
        if container_id:
            container = self.application.srv.objects.get(long(container_id))
        agent.log.info('open container container_id={}'.format(container_id))
        if isinstance(container, POIContainer) and container.is_available(agent=agent):
            self.render("inventory_container_window.html", car_id=agent.api.car.uid, container_id=container_id)


class BarterInventoryHandler(BaseHandler):
    @tornado.gen.coroutine
    def get(self):
        agent = yield self.application.srv.api.get_agent(self.current_user, make=False, do_disconnect=False)
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
        inv_id = None
        if agent is barter.initiator:
            inv_id = barter.initiator_inv.owner.uid
            my_table_id = barter.initiator_table_obj.uid
            other_table_id = barter.recipient_table_obj.uid
        else:
            inv_id = barter.recipient_inv.owner.uid
            my_table_id = barter.recipient_table_obj.uid
            other_table_id = barter.initiator_table_obj.uid

        barter_name = '{!r} <=> {!r}'.format(barter.initiator.print_login(), barter.recipient.print_login())  # todo: use unicode
        agent.log.info('open barter barter_name={!r}'.format(barter_name))
        if agent.current_location is None:
            self.render("inventory_barter_window.html", agent=agent, inv_id=inv_id, barter=barter,
                        my_table_id=my_table_id, other_table_id=other_table_id, barter_name=barter_name, in_location=False)
        else:
            self.render("inventory_barter.html", agent=agent, inv_id=inv_id, barter=barter,
                        my_table_id=my_table_id, other_table_id=other_table_id, barter_name=barter_name, in_location=True)

