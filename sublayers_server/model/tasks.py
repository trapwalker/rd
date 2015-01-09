# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from abc import ABCMeta

import events


class TaskError(Exception):
    pass


class TaskEvent(events.Event):
    def __init__(self, task, **kw):
        super(TaskEvent, self).__init__(**kw)
        assert task
        self.task = task

    def on_perform(self):
        super(TaskEvent, self).on_perform()
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

    def _cancel_events(self):
        events = self.events
        while events:
            event = events.pop()
            self.on_del_event(event)

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
        self._cancel_events()
        self.on_pause()
        self.is_paused = True

    def done(self):
        assert self.is_started and not self.is_cancelled and not self.is_done
        self._cancel_events()
        self.on_done()
        self.is_done = True
        if self in self.owner.tasks:
            self.owner.tasks.remove(self)

    def cancel(self):
        assert not self.is_cancelled and not self.is_done
        self._cancel_events()
        self.on_cancel()
        self.is_cancelled = True
        if self in self.owner.tasks:
            self.owner.tasks.remove(self)

    def perform(self, event):
        if event in self.events:
            self.events.remove(event)
        self.on_perform(event)

    def add_event(self, event):
        self.events.append(event)
        self.on_add_event(event)

    def del_event(self, event):
        if event in self.events:
            self.events.remove(event)
            self.on_del_event(event)
        if not self.events:
            self.done()

    def on_perform(self, event):
        pass

    def on_start(self):
        pass

    def on_pause(self):
        pass

    def on_resume(self):
        pass

    def on_done(self):
        log.debug('Task on done !!!!')
        pass

    def on_cancel(self):
        pass

    def on_add_event(self, event):
        event.send()

    def on_del_event(self, event):
        event.cancel()
    
# todo: Make "Follow" task +modifiers (aggresive, sneaking, defending, ...)
# todo: Make "Scouting" task +modifiers (aggresive, sneaking, defending, ...)
# todo: Make "Goto" task modifiers (aggresive, sneaking, ...)
# todo: Make "Standing" task modifiers (aggresive, sneaking, defending, ...)
