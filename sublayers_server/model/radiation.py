# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)


from sublayers_server.model.base import Observer
from sublayers_server.model.units import Unit
from sublayers_server.model.messages import Message


class ChangeRadiation(Message):
    def __init__(self, radiation_dps, obj_id, **kw):
        super(ChangeRadiation, self).__init__(**kw)
        self.radiation_dps = radiation_dps
        self.obj_id = obj_id

    def as_dict(self):
        d = super(ChangeRadiation, self).as_dict()
        d.update(
            radiation_dps=self.radiation_dps,
            obj_id=self.obj_id,
        )
        return d


# Все машинки быстрой игры должны быть в круге этого объекта. Как только они покидают его, то начинают получать дамаг
class StationaryRadiation(Observer):
    def __init__(self, **kw):
        super(StationaryRadiation, self).__init__(**kw)
        self.targets = []
        self.radiation_dps = self.example.radiation_dps
        self.effects = []  # todo: забирать названия эффектов из экзампла

    def _on_effects(self, obj, time):
        if obj not in self.targets and obj.is_frag:
            self.targets.append(obj)
            for effect in self.effects:
                effect.start(owner=obj, time=time)

    def _off_effects(self, obj, time):
        if obj in self.targets:
            for effect in self.effects:
                effect.done(owner=obj, time=time)
            self.targets.remove(obj)

    def on_before_delete(self, event):
        targets = self.targets[:]
        for target in targets:
            self._off_effects(obj=target, time=event.time)
            target.set_hp(time=event.time, dps=-self.radiation_dps)
        assert len(self.targets) == 0
        super(StationaryRadiation, self).on_before_delete(event=event)

    def on_kill(self, **kw):
        pass

    def on_contact_in(self, time, obj):
        super(StationaryRadiation, self).on_contact_in(time=time, obj=obj)
        if isinstance(obj, Unit):
            self._on_effects(obj=obj, time=time)
            obj.set_hp(time=time, dps=self.radiation_dps)
            if obj.main_agent:
                ChangeRadiation(agent=obj.main_agent, time=time, radiation_dps=self.radiation_dps, obj_id=obj.id).post()

    def on_contact_out(self, time, obj):
        super(StationaryRadiation, self).on_contact_out(time=time, obj=obj)
        if isinstance(obj, Unit):
            self._off_effects(obj=obj, time=time)
            obj.set_hp(time=time, dps=-self.radiation_dps)
            if obj.main_agent:
                ChangeRadiation(agent=obj.main_agent, time=time, radiation_dps=-self.radiation_dps, obj_id=obj.id).post()
