# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from base import Observer


class Trigger(Observer):
    def __init__(self, observing_range=500.0, **kw):
        super(Trigger, self).__init__(observing_range=observing_range, **kw)
        log.debug('Trigger %s init', self)

    def on_contact_in(self, obj):
        pass

    def on_contact_out(self, obj):
        pass
