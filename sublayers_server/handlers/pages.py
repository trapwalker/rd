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
                time = self.application.srv.get_time()
                connection_delay = agent.get_connection_delay(time=time)
                if connection_delay is None:
                    self.redirect('/static/connection_trouble.html')
                    return

                coord = agent.get_loading_coord(time=time)

                # todo: убрать все что касается is_tester
                if not user.quick and not user.is_tester and user.registration_status == 'register':
                    first_enter = user.teaching_state == ""  # Значит он не отвечал на вопрос про обучение
                    if user.teaching_state != "map" and user.teaching_state != "map_start":
                        self.render(
                            "play.html",
                            ws_port=options.ws_port,
                            map_link=options.map_link,
                            server_mode=options.mode,
                            host_name=options.mobile_host,
                            user_name=user.name,
                            first_enter=first_enter,
                            start_coord=coord,
                            insurance_name=agent.example.profile.insurance.title,
                            user_balance=agent.balance,
                            connection_delay=connection_delay,
                        )
                    else:
                        log.warning('{} with teaching_state = {} try to connect on main server'.format(user, user.teaching_state))
                        self.redirect('/quick/play')
                else:
                    self.redirect(self.get_login_url())

            if options.mode == 'quick':
                if not user.quick and user.teaching_state != "map" and user.teaching_state != "map_start":
                    log.warning('{} with teaching_state = {} try to connect on quick server'.format(user, user.teaching_state))
                    self.redirect('/play')
                    return

                if not user.quick and user.teaching_state == "map_start":
                    # Значит уже была попытка начать квест обучения, но его не закончили. попробовать найти агента, и если его нет, то вернуться на /play
                    agent = self.application.srv.agents.get(str(user.pk), None)
                    if not agent:
                        log.warning('{} with teaching_state = {} try to connect on quick server'.format(user, user.teaching_state))
                        self.redirect('/play')
                        return

                coord = None
                agent = self.application.srv.agents.get(str(user.pk), None)
                if agent and agent.car:
                    coord = agent.car.position(time=self.application.srv.get_time())
                else:
                    coord = Point.random_point(self.application.srv.quick_game_start_pos, self.application.srv.quick_game_respawn_bots_radius)

                user.start_position = Position(coord.x, coord.y)
                user.save()

                connection_delay = 0
                if agent:
                    connection_delay = agent and agent.get_connection_delay(time=self.application.srv.get_time())
                    if connection_delay is None:
                        self.redirect('/static/connection_trouble.html')
                        return

                self.render(
                    "play.html",
                    ws_port=options.ws_port,
                    map_link=options.map_link,
                    server_mode=options.mode,
                    host_name=options.mobile_host,
                    user_name=user.name,
                    first_enter=False,
                    start_coord=coord,
                    insurance_name='quick',
                    user_balance=0,
                    connection_delay=connection_delay,
                )
        else:
            self.redirect(self.get_login_url())


class MobilePlayHandler(BaseHandler):
    def get(self):
        self._quick_registration()
        options = self.application.options
        self.render("mobile/play.html", ws_port=options.ws_port, map_link=options.map_link, host_name=options.mobile_host)
