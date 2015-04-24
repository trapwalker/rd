# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

import metrics


class StatLogger(object):
    way = metrics.IncMetric(name='way', doc=u"Совокупное пройденное расстояние")
    frag = metrics.IncMetric(name='frag', doc=u"Кол-во убийств")

    s_agents_all = metrics.IncMetric(name='s_agents_all', doc=u"Кол-во созданных агентов на сервере")
    s_agents_on = metrics.IncMetric(name='s_agents_on', doc=u"Кол-во агентов онлайн на сервере")
    s_units_all = metrics.IncMetric(name='s_units_all', doc=u"Кол-во объектов-юнитов (на карте), созданных на сервере")
    s_units_on = metrics.IncMetric(name='s_units_on', doc=u"Кол-во активных (живых) юнитов на сервере")
    s_events_all = metrics.IncMetric(name='s_events_all', doc=u"Кол-во созданных евентов")
    s_events_on = metrics.IncMetric(name='s_events_on', doc=u"Кол-во евентов в очереди")
    s_events_lag_max = metrics.ValueMetric(name='s_events_lag_max', doc=u"Максимальное отставание евентов")
    s_events_lag_cur = metrics.ValueMetric(name='s_events_lag_cur', doc=u"Текущее отставание евентов")
    s_events_lag_mid = metrics.MovingAverageMetric(name='s_events_lag_cur', doc=u"Среднее отставание евентов")

    def __init__(self, owner):
        self.owner = owner
        self.m_dict = dict()

    def get_metric(self, metric):
        return getattr(self, metric).value()


if __name__ == '__main__':
    pass
