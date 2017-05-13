# -*- coding: utf-8 -*-

import logging

log = logging.getLogger(__name__)

from sublayers_common.handlers.base import BaseHandler


class MapTeachingHandler(BaseHandler):
    def get(self):
        window_name = self.get_argument('window_name', default='')
        if window_name == 'cruise_speed':
            self.render("map_teaching/cruise_speed.html")
        elif window_name == 'cruise_zone':
            self.render("map_teaching/cruise_zone.html")
        elif window_name == 'cruise_speed_control':
            self.render("map_teaching/cruise_speed_control.html")
        elif window_name == 'cruise_speed_btn':
            self.render("map_teaching/cruise_speed_btn.html")
        elif window_name == 'driving_control':
            self.render("map_teaching/driving_control.html")
        elif window_name == 'cruise_radial':
            self.render("map_teaching/cruise_radial.html")
        elif window_name == 'zoom_slider':
            self.render("map_teaching/zoom_slider.html")
        elif window_name == 'discharge_shooting':
            self.render("map_teaching/discharge_shooting.html")
        elif window_name == 'auto_shooting':
            self.render("map_teaching/auto_shooting.html")
        elif window_name == 'try_kill':
            self.render("map_teaching/try_kill.html")
        elif window_name == 'try_game':
            self.render("map_teaching/try_game.html")
        self.send_error(status_code=404)


class ConsoleAnswerTeachingHandler(BaseHandler):
    def get(self):
        user = self.current_user
        # todo: check authorization by decorator
        if not user:
            self.finish("")
            return

        answer = self.get_argument('answer', default=False)
        answer = False if answer == 'false' else True
        if user.teaching_state == "":
            user.teaching_state = "map" if answer else "cancel"
            user.save()
            self.finish('/quick/play' if answer else "")
        else:
            # todo: is it standard situation?
            log.warning('{} with teaching_state = {} second response Console Answer'.format(user, user.teaching_state))
            self.finish("")


class ResetTeachingHandler(BaseHandler):
    def get(self):
        user = self.current_user
        # todo: check authorization by decorator
        if not user:
            self.finish('Not Authorized')
            return

        last_state = user.teaching_state
        user.teaching_state = ""
        user.save()
        self.finish('OK! last state = {}'.format(last_state))
