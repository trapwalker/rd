# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)


from collections import Counter
from itertools import imap


class CounterSet(Counter):
    def __init__(self, *av, **kw):
        super(CounterSet, self).__init__(*av, **kw)
        assert all(imap(lambda v: v > 0, self.values()))  # todo: optimization possible

    def __setitem__(self, k, v):
        assert v >= 0
        if v == 0:
            del self[k]
        else:
            super(CounterSet, self).__setitem__(k, v)
