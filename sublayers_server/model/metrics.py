# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)


class Metric(object):
    __str_template__ = 'metric::{self.classname}[{time}] #{stat_log.owner}'
    def_value = None

    def __call__(self, stat_log, time):
        pass
        # log.info(self.__str_template__.format(self=self, time=time, stat_log=stat_log))

    @property
    def classname(self):
        return self.__class__.__name__


class MetricWay(Metric):
    __str_template__ = 'metric::{self.classname}[{time}] #{stat_log.owner} => {stat_log.m_dict[way]}'
    def_value = 0.0

    def __call__(self, stat_log, d_way, **kw):
        if 'way' in stat_log.m_dict:
            stat_log.m_dict['way'] += d_way
        else:
            stat_log.m_dict.update(way=d_way)
        super(MetricWay, self).__call__(stat_log=stat_log, **kw)


class MetricFrag(Metric):
    __str_template__ = 'metric::{self.classname}[{time}] #{stat_log.owner} => {stat_log.m_dict[frag]}'
    def_value = 0

    def __call__(self, stat_log, **kw):
        if 'frag' in stat_log.m_dict:
            stat_log.m_dict['frag'] += 1
        else:
            stat_log.m_dict.update(frag=1)
        super(MetricFrag, self).__call__(stat_log=stat_log, **kw)


if __name__ == '__main__':
    pass





