# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_common.handlers.base import BaseHandler

import tornado.web
import tornado.gen

from tornado.options import options
from sublayers_server.model.vectors import Point
from sublayers_server.model.registry_me.tree import Position


class PlayHandler(BaseHandler):
    def get(self):
        user = self.current_user
        # todo: ##REFACTORING
        if user is not None:
            if options.mode == 'basic':
                coord = None
                agent = self.application.srv.api.get_agent(user=user, make=True, do_disconnect=False)
                if not agent:
                    self.redirect(self.get_login_url())
                    return
                if agent.car:
                    coord = agent.car.position(time=self.application.srv.get_time())
                elif agent.current_location:
                    coord = agent.current_location.example.position
                elif agent.example.profile.car:
                    coord = agent.example.profile.car.position

                # todo: убрать все что касается is_tester
                if not user.quick and not user.is_tester:
                    first_enter = user.teaching_state == ""  # Значит он не отвечал на вопрос про обучение
                    if user.teaching_state != "map":
                        self.render("play.html", ws_port=options.ws_port, map_link=options.map_link,
                                    server_mode=options.mode, host_name=options.mobile_host, user_name=user.name,
                                    first_enter=first_enter, start_coord=coord,
                                    insurance_name=agent.example.profile.insurance.title, user_balance=agent.balance)
                    else:
                        log.warning('{} with teaching_state = {} try to connect on main server'.format(user, user.teaching_state))
                        self.redirect('/quick/play')
                else:
                    self.redirect(self.get_login_url())

            if options.mode == 'quick':
                coord = None
                agent = self.application.srv.agents.get(str(user.pk), None)
                if agent and agent.car:
                    coord = agent.car.position(time=self.application.srv.get_time())
                else:
                    coord = Point.random_point(self.application.srv.quick_game_start_pos, self.application.srv.quick_game_respawn_bots_radius)
                user.start_position = Position(coord.x, coord.y)
                user.save()
                if (not user.quick) and (user.teaching_state != "map"):
                    log.warning('{} with teaching_state = {} try to connect on quick server'.format(user, user.teaching_state))
                    self.redirect('/play')
                    return
                self.render("play.html", ws_port=options.ws_port, map_link=options.map_link,
                            server_mode=options.mode, host_name=options.mobile_host, user_name=user.name,
                            first_enter=False, start_coord=coord)
        else:
            self.redirect(self.get_login_url())


class MobilePlayHandler(BaseHandler):
    def get(self):
        self._quick_registration()
        options = self.application.options
        self.render("mobile/play.html", ws_port=options.ws_port, map_link=options.map_link, host_name=options.mobile_host)
