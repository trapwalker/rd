# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from functools import partial


class Metric(object):
    __st1r_template__ = 'metric::{self.classname}[{time}] #{stat_log.owner}'

    def __init__(self, name=None, doc=None):
        self.name = name or self.classname
        self.doc = doc

    def __get__(self, obj, types):
        # todo: docstring generation
        f = partial(self.call, stat_log=obj)
        f.value = partial(self.value, stat_log=obj)
        f.metric = self
        return f

    def call(self, stat_log, time):
        pass

    def value(self, stat_log):
        return

    @property
    def classname(self):
        return self.__class__.__name__


class IncMetric(Metric):
    __str_template__ = 'metric::{self.classname}[{time}] #{stat_log.owner} => {stat_log.m_dict[way]}'

    def __init__(self, init=0.0, delta=None, **kw):
        super(IncMetric, self).__init__(**kw)
        self.init = init
        self.delta = delta

    def call(self, stat_log, delta=None, **kw):
        name = self.name
        storage = stat_log.m_dict
        if delta is None:
            delta = self.delta
        assert delta is not None
        storage[name] = storage.get(name, self.init) + delta
        super(IncMetric, self).call(stat_log=stat_log, **kw)

    def value(self, stat_log):
        storage = stat_log.m_dict
        return storage.get(self.name, self.init)

class ValueMetric(Metric):
    __str_template__ = 'metric::{self.classname}[{time}] #{stat_log.owner} => {stat_log.m_dict[way]}'

    def __init__(self, init=0.0, delta=None, **kw):
        super(ValueMetric, self).__init__(**kw)
        self.init = init
        self.delta = delta

    def call(self, stat_log, value=None, **kw):
        name = self.name
        storage = stat_log.m_dict
        if value is None:
            return
        storage[name] = value
        super(ValueMetric, self).call(stat_log=stat_log, **kw)

    def value(self, stat_log):
        storage = stat_log.m_dict
        return storage.get(self.name, self.init)


if __name__ == '__main__':
    pass
