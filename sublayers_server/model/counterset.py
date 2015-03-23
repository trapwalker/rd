# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)


from collections import Counter
from itertools import imap


class CounterSet(Counter):
    def __init__(self, *av, **kw):
        super(CounterSet, self).__init__(*av, **kw)
        assert all(imap(lambda v: v > 0, self.values()))  # todo: optimization possible


    #def __setitem__(self, k, v):
        #assert v >= 0, 'value = {}'.format(v)
        #if v == 0:
        #    del self[k]
        #else:
        #super(CounterSet, self).__setitem__(k, v)

    def inc(self, key, step=1):
        v = self[key] + step
        self[key] = v
        return v

    def dec(self, key, step=1):
        v = self[key] - step
        self[key] = v
        return v


    def get_keys_more_value(self, value=0):
        for key in self.keys():
            if self[key] > value:
                yield key
    '''
    def get_keys_more_value(self, value=0):
        res = []
        for key in self.keys():
            if self[key] > value:
                res.append(key)
        return res
    '''