# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

import metrics


class StatLogger(object):
    way = metrics.MetricWay()

    def __init__(self, owner):
        self.owner = owner
        self.m_dict = dict()


if __name__ == '__main__':
    pass

