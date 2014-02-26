# -*- coding: utf-8 -*-

from abc import ABCMeta, abstractmethod

from time import time
# todo: integer vs float time


class Task(object):

    __metaclass__ = ABCMeta

    def __init__(self, owner, start_time=None, **kw):
        super(Task, self).__init__(**kw)
        self.owner = owner
        self.start_time = start_time or time()


class Moving(Task):

    def __init__(self, **kw):
        super(Moving, self).__init__(**kw)

    @abstractmethod
    def get_position(self):
        pass


class Goto(Task):

    def __init__(self, strart_point, target_point, **kw):
        super(Goto, self).__init__(**kw)
        self.strart_point = strart_point
        self.target_point = target_point

    @property
    def finish_time(self):
        pass






