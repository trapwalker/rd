# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from abc import ABCMeta

import events


class TaskError(Exception):
    pass


class TaskEvent(events.Event):

    def __init__(self, task, **kw):
        """
        @param Task task: Task for performing
        """
        super(TaskEvent, self).__init__(server=task.owner.server, **kw)
        self.task = task
        task.events.append(self)

    def on_cancel(self):
        self.task.events.remove(self)

    def on_perform(self):
        self.task.events.remove(self)
        self.task.perform(self)


class Task(object):
    __metaclass__ = ABCMeta
    __str_template__ = '<{self.__class__.__name__} [{self.status_str}]>'

    def __init__(self, owner):
        """
        @param sublayers_server.model.units.Unit owner: Owner of task
        """
        super(Task, self).__init__()
        self.owner = owner
        self._get_time = owner.server.get_time
        self.is_started = False
        self.is_paused = False
        self.is_cancelled = False
        self.is_done = False
        owner.tasks.append(self)
        self.events = []

    @property
    def status_str(self):
        return ''.join([
            'S' if self.is_started else 's',
            'P' if self.is_paused else 'p',
            'C' if self.is_cancelled else 'c',
            'D' if self.is_done else 'd',
        ])

    def __str__(self):
        return self.__str_template__.format(self=self)

    id = property(id)

    @property
    def is_worked(self):
        return self.is_started and not self.is_cancelled and not self.is_done and not self.is_paused

    @property
    def classname(self):
        return self.__class__.__name__

    def as_dict(self):
        # todo: suspend store serialization
        return dict(
            cls=self.classname,
        )

    def to_plan(self, time=None, dt=0.0):
        t = time or self.owner.server.get_time() + dt
        TaskEvent(time=t, task=self).send()

    def start(self):
        #log.debug('TASK start: %s', self)
        if not self.is_started:
            self.on_start()
            self.is_started = True
        elif self.is_paused:
            self.on_resume()
            self.is_paused = False
        else:
            raise TaskError('Trying to start of already started task')

    def pause(self):
        assert self.is_worked
        self.on_pause()
        self.is_paused = True

    def done(self):
        assert self.is_started and not self.is_cancelled and not self.is_done
        self.on_done()
        self.is_done = True
        self.owner.tasks.remove(self)

    def cancel(self):
        assert not self.is_cancelled and not self.is_done
        self.on_cancel()
        self.is_cancelled = True
        self.owner.tasks.remove(self)

    def perform(self, event):
        self.on_perform(event)

    def on_perform(self, event):
        pass

    def on_start(self):
        pass

    def on_pause(self):
        pass

    def on_resume(self):
        pass

    def on_done(self):
        pass

    def on_cancel(self):
        pass


class Goto(Task):
    pass

    
# todo: Make "Follow" task +modifiers (aggresive, sneaking, defending, ...)
# todo: Make "Scouting" task +modifiers (aggresive, sneaking, defending, ...)
# todo: Make "Goto" task modifiers (aggresive, sneaking, ...)
# todo: Make "Standing" task modifiers (aggresive, sneaking, defending, ...)
