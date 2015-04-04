# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

import metrics


class StatLogger(object):
    way = metrics.IncMetric(name='way', doc=u"Совокупное пройденное расстояние")
    frag = metrics.IncMetric(name='frag', doc=u"Кол-во убийств")

    def __init__(self, owner):
        self.owner = owner
        self.m_dict = dict()

    def get_metric(self, metric):
        return getattr(self, metric).value()


if __name__ == '__main__':
    pass
