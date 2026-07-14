# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)


class MetricHolder(object):
    def __init__(self):
        self.storage = {}

    #def _set(self, name, attr, value):
        

    def __call__(self, name, value=None, time=None):
        storage = self.storage
        if value is not None:            
            key = name + '.max'
            # незаконченный код ещё со времён Python 2:
            # if key in
            # self.storage[] =
            pass
        


if __name__ == '__main__':

    m = MetricHolder()
