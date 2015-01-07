# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from abc import ABCMeta

from utils import time_log_format


class Task(object):
    __metaclass__ = ABCMeta
    __str_template__ = '<{self.__class__.__name__} in {self.start_time_str} [{self.status_str}]'

    def __init__(self, owner):
        """
        @param sublayers_server.model.units.Unit owner: Owner of task
        """
        super(Task, self).__init__()
        self.owner = owner
        self._get_time = owner.server.get_time
        self.start_time = None
        self.is_started = False
        self.is_cancelled = False
        self.is_done = False

    @property
    def status_str(self):
        return ''.join([
            'S' if self.is_started else 's',
            'C' if self.is_cancelled else 'c',
            'D' if self.is_done else 'd',
        ])

    @property
    def is_worked(self):
        return self.is_started and not self.is_cancelled and not self.is_done

    @property
    def classname(self):
        return self.__class__.__name__

    def as_dict(self):
        # todo: suspend store serialization
        return dict(
            cls=self.classname,
            start_time=self.start_time,
        )

    def start(self, **kw):
        #log.debug('TASK start: %s', self)
        self.start_time = self._get_time()
        self.on_before_start(**kw)
        self.is_started = True
        self.on_after_start(**kw)

    def done(self, **kw):
        #log.debug('TASK done: %s', self)
        self.on_before_end(**kw)
        self.is_done = True
        self.on_after_end(**kw)

    def cancel(self, **kw):
        #log.debug('TASK cancel: %s', self)
        #raise Exception('#############')
        self.on_before_end(**kw)
        self.is_cancelled = True
        self.on_after_end(**kw)

    def on_before_start(self, **kw):
        pass

    def on_after_start(self, **kw):
        pass

    def on_before_end(self, **kw):
        pass

    def on_after_end(self, **kw):
        pass

    def __str__(self):
        return self.__str_template__.format(self=self)

    @property
    def start_time_str(self):
        if self.start_time is None:
            return "#N/A"
        return time_log_format(self.start_time)

    id = property(id)


class Goto(Task):
    pass

    
# todo: Make "Follow" task +modifiers (aggresive, sneaking, defending, ...)
# todo: Make "Scouting" task +modifiers (aggresive, sneaking, defending, ...)
# todo: Make "Goto" task modifiers (aggresive, sneaking, ...)
# todo: Make "Standing" task modifiers (aggresive, sneaking, defending, ...)
