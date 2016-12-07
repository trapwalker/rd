# -*- coding: utf-8 -*-

import logging

log = logging.getLogger(__name__)

from sublayers_common.handlers.base import BaseHandler
import tornado.gen


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
    @tornado.gen.coroutine
    def get(self):
        user = self.current_user
        if not user:
            self.finish("")
            return
        answer = self.get_argument('answer', default=False)
        answer = False if answer == 'false' else True
        if user.teaching_state == "":
            if answer:
                user.teaching_state = "map"
            else:
                user.teaching_state = "cancel"
            yield user.save()
            if answer:
                self.finish('/quick/play')
            else:
                self.finish("")
        else:
            log.warning('{} with teaching_state = {} second response Console Answer'.format(user, user.teaching_state))
            self.finish("")


class ResetTeachingHandler(BaseHandler):
    @tornado.gen.coroutine
    def get(self):
        user = self.current_user
        if user:
            last_state = user.teaching_state
            user.teaching_state = ""
            yield user.save()
            print 'reset'
            self.finish('OK! last state = {}'.format(last_state))
        else:
            self.finish('Not Authorized')
