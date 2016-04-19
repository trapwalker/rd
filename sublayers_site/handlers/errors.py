# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from server.handlers.base import BaseHandler


class SiteErrorHandler(BaseHandler):
    def get(self):
        self.finish('Ошибка! Вы не должны были сюда попасть! Нажмите назад, позвоните нам, расскажите о своих проблемах')