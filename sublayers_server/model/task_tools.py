# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from tasks import TaskSingleton, TaskPerformEvent
from vectors import Point
import random


class CrazyTask(TaskSingleton):
    def __init__(self, target_id=None, **kw):
        super(CrazyTask, self).__init__(**kw)
        self.target_id = target_id
        # todo: identify target by name too

    def on_perform(self, event):
        super(CrazyTask, self).on_perform(event=event)
        car = self.owner
        if car.limbo:
            self.done()

        dt = abs(random.gauss(0, 5)) + 1.5  # sec
        TaskPerformEvent(time=car.server.get_time() + dt, task=self).post()
        p = None
        target = None

        if self.target_id:
            target = car.server.objects.get(self.target_id)
        if not target and hasattr(car.server, 'mission_cargo'):
            target = car.server.mission_cargo

        if target and hasattr(target, 'position'):
            p = Point.random_gauss(target.position, Point(1000, 1000))

        p = p or Point.random_gauss(car.position, Point(1000, 1000))
        log.debug('%s crazy go to %s position', car, target or p)
        car.set_motion(position=p, cc=1.0)

    def on_start(self, event):
        super(CrazyTask, self).on_start(event=event)
        TaskPerformEvent(task=self).post()
