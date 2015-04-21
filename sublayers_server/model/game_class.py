# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)


class BaseMeta(type):

    def f(self):
        return 13

    x = property(f)
    



def load():
    pass
