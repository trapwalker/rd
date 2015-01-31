# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from abc import ABCMeta
import events


class TaskError(Exception):
    pass


class TaskPerformEvent(events.Event):
    def __init__(self, task, **kw):
        assert task
        super(TaskPerformEvent, self).__init__(server=task.owner.server, **kw)
        self.task = task
        task.events.append(self)

    def _del_event_from_task(self):
        task = self.task
        if self in task.events:
            task.events.remove(self)
        if not task.events:
            self.task.on_done(self)

    def on_perform(self):
        super(TaskPerformEvent, self).on_perform()
        self.task.on_perform(self)
        self._del_event_from_task()

    def on_cancel(self):
        self._del_event_from_task()
        super(TaskPerformEvent, self).on_cancel()


class TaskInitEvent(events.Event):
    def __init__(self, task, **kw):
        assert task
        super(TaskInitEvent, self).__init__(server=task.owner.server, **kw)
        self.task = task

    def on_perform(self):
        super(TaskInitEvent, self).on_perform()
        if not self.task.owner.limbo:
            self.task.on_start(self)
        else:
            self.task.on_done(self)


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
        self.is_done = False
        owner.tasks.append(self)
        self.events = []

    @property
    def status_str(self):
        return ''.join([
            'S' if self.is_started else 's',
            'D' if self.is_done else 'd',
        ])

    def __str__(self):
        return self.__str_template__.format(self=self)

    @property
    def is_worked(self):
        return self.is_started and not self.is_done

    @property
    def classname(self):
        return self.__class__.__name__

    def as_dict(self):
        # todo: suspend store serialization
        return dict(
            cls=self.classname,
        )

    def _cancel_events(self):
        e = self.events
        while e:
            e.pop().cancel()

    def start(self):
        if not self.is_started:
            self.is_started = True
            TaskInitEvent(task=self).post()
        else:
            raise TaskError('Trying to start of already started task')

    def done(self):
        assert self.is_started and not self.is_done
        self._cancel_events()

    def perform(self):
        # здесь должен создаваться потомок TaskPerformEvent
        pass

    def on_perform(self, event):
        assert self.is_started

    def on_start(self, event):
        pass

    def on_done(self, event):
        self.is_done = True
        self.owner.tasks.remove(self)
