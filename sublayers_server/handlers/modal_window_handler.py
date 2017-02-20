# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

import tornado.template

from sublayers_common.handlers.base import BaseHandler


class APIGetQuickGameCarsView(BaseHandler):
    def get(self):
        car_templates_list = []
        template_car_img = tornado.template.Loader(
            "../sublayers_server/templates/location",
            namespace=self.get_template_namespace()
        ).load("car_info_img_ext.html")

        template_table = tornado.template.Loader(
            "../sublayers_server/templates/location",
            namespace=self.get_template_namespace()
        ).load("car_info_table.html")

        for car_proto in self.application.srv.quick_game_cars_proto:
            html_car_img = template_car_img.generate(car=car_proto)
            html_car_table = template_table.generate(car=car_proto)
            car_templates_list.append(dict(img=html_car_img, table=html_car_table))

        self.render("quick_game_cars_death_window_view.html", quick_game_cars_html=car_templates_list,
                    cars=self.application.srv.quick_game_cars_proto)
