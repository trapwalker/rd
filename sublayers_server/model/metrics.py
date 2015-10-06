# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from functools import partial


class Metric(object):
    __st1r_template__ = 'metric::{self.classname}[{time}]'

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

    def __init__(self, init=0.0, delta=None, **kw):
        super(IncMetric, self).__init__(**kw)
        self.init = init
        self.delta = delta

    def call(self, stat_log, delta=None, **kw):
        name = self.name
        if delta is None:
            delta = self.delta
        assert delta is not None
        stat_log[name] = stat_log.get(name, self.init) + delta
        super(IncMetric, self).call(stat_log=stat_log, **kw)

    def value(self, stat_log):
        return stat_log.get(self.name, self.init)


class ValueMetric(Metric):
    def __init__(self, init=0.0, delta=None, **kw):
        super(ValueMetric, self).__init__(**kw)
        self.init = init
        self.delta = delta

    def call(self, stat_log, value=None, **kw):
        name = self.name
        if value is None:
            return
        stat_log[name] = value
        super(ValueMetric, self).call(stat_log=stat_log, **kw)

    def value(self, stat_log):
        return stat_log.get(self.name, self.init)


# Метрика для расчёта средних значений. Использовать только для объектов-синглтонов !!!
class MovingAverageMetric(Metric):
    def __init__(self, max_count=10, **kw):
        super(MovingAverageMetric, self).__init__(**kw)
        self._max_count = max_count
        self._val = 0.0
        self._count = 0
        from collections import deque
        self.mid_d = deque()

    def call(self, stat_log, value, **kw):
        super(MovingAverageMetric, self).call(stat_log=stat_log, **kw)
        v = value / self._max_count
        if self._count < self._max_count:
            self.mid_d.append(v)
            self._val += v
            self._count += 1
        else:
            lv = self.mid_d.popleft()
            self.mid_d.append(v)
            self._val -= lv
            self._val += v

    def value(self, stat_log):
        return self._val


if __name__ == '__main__':
    pass
