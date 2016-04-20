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
            if key in 
            self.storage[] = 
        


if __name__ == '__main__':

    m = MetricHolder()
