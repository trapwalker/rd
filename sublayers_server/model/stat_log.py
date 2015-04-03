# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

import metrics


class StatLogger(object):
    way = metrics.MetricWay()
    frag = metrics.MetricFrag()

    def __init__(self, owner):
        self.owner = owner
        self.m_dict = dict()

    def get_metric(self, metric):
        if metric in self.m_dict:
            return self.m_dict[metric]
        else:
            return self.__getattribute__(metric).def_value
