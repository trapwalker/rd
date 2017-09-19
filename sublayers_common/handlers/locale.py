# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_site.handlers.base_site import BaseSiteHandler
from sublayers_common.site_locale import locale_objects


class GetUserLocaleJSONHandler(BaseSiteHandler):
    def get(self):
        if locale_objects.get(self.user_lang, None):
            self.finish(locale_objects[self.user_lang])
        else:
            self.send_error(status_code=404)