# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_common.handlers.base import BaseHandler

import tornado.web
import tornado.gen
from tornado.options import options
import tornado.template
from tornado.httpclient import AsyncHTTPClient
from bson.objectid import ObjectId, InvalidId
import json




class BaseSiteHandler(BaseHandler):
    @tornado.gen.coroutine
    def _get_car(self, username):
        http = AsyncHTTPClient()
        try:
            response = yield http.fetch(request=options.get_user_info + '?username=' + username, method="GET",
                                        headers={'Content-Type': 'application/x-www-form-urlencoded'})
        except:
            raise tornado.gen.Return(dict())
        if response.body:
            raise tornado.gen.Return(json.loads(response.body))
        else:
            raise tornado.gen.Return(dict())

    @tornado.gen.coroutine
    def _get_quick_game(self):
        car_examples = self.application.quick_game_cars_examples
        car_templates_list = []

        template_car = tornado.template.Loader(
            "../sublayers_server/templates/site",
            namespace=self.get_template_namespace()
        ).load("car_info_ext_wrap.html")

        for car_ex in car_examples:
            html_car_img = template_car.generate(car=car_ex)
            car_templates_list.append(html_car_img)
        return dict(quick_cars=car_templates_list)
