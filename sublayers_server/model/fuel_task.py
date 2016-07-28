# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.tasks import TaskPerformEvent, TaskSingleton
from sublayers_server.model.events import Objective
from copy import copy


class FuelEmpty(Objective):
    def on_perform(self):
        super(FuelEmpty, self).on_perform()
        self.obj.on_fuel_empty(self)


class FuelTaskEvent(TaskPerformEvent):
    def __init__(self, df=None, dfs=None, is_fuel_empty=False, **kw):
        super(FuelTaskEvent, self).__init__(**kw)
        self.df = df
        self.dfs = dfs
        self.is_fuel_empty = is_fuel_empty


class FuelTask(TaskSingleton):
    def __init__(self, df=None, **kw):
        super(FuelTask, self).__init__(**kw)
        assert self.owner.fuel_state is not None
        self.df = df
        self.dfs = self.owner.params.get('p_fuel_rate').value if self.owner.state.is_moving else 0.0

    def _update_state(self, df, dfs, is_fuel_empty, event):
        owner = self.owner
        if is_fuel_empty:
            owner.fuel_state.set_fuel_empty(event.time)
            FuelEmpty(time=event.time, obj=owner).post()
            return
        owner.fuel_state.update(t=event.time, df=df, dfs=dfs)
        owner.on_update(event=event)

    def on_perform(self, event):
        super(FuelTask, self).on_perform(event=event)
        self._update_state(df=event.df, dfs=event.dfs, is_fuel_empty=event.is_fuel_empty, event=event)

    def on_start(self, event):
        super(FuelTask, self).on_start(event=event)
        owner = self.owner
        time = event.time
        time_fuel_empty = copy(owner.fuel_state).update(t=time, df=self.df, dfs=self.dfs)

        if time_fuel_empty == time:  # если время дамага совпадает с временем смерти, то один евент
            self._update_state(df=self.df, dfs=self.dfs, is_fuel_empty=True, event=event)
            self.done()
        else:  # если времена разные, то добавить оба евента
            self._update_state(df=self.df, dfs=self.dfs, is_fuel_empty=False, event=event)
            if time_fuel_empty is not None:
                FuelTaskEvent(time=time_fuel_empty, task=self, is_fuel_empty=True).post()
            else:
                self.done()
