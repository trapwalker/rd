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
        self.targets = dict()
        self.radiation_dps = self.example.radiation_dps

    def on_before_delete(self, event):
        for obj_id, dps in self.targets.iteritems():
            obj = self.server.objects[obj_id]
            if obj:
                obj.set_hp(time=event.time, dps=-dps)
        self.targets = dict()
        super(StationaryRadiation, self).on_before_delete(event=event)

    def on_kill(self, **kw):
        pass

    def calc_radiation_dps(self, obj, time):
        return self.radiation_dps * (1. - obj.params.get('p_radiation_armor').value / 100.)

    def on_contact_in(self, time, obj):
        super(StationaryRadiation, self).on_contact_in(time=time, obj=obj)
        if isinstance(obj, Unit) and obj.id not in self.targets:
            dps = self.calc_radiation_dps(obj=obj, time=time)
            self.targets[obj.id] = dps
            obj.set_hp(time=time, dps=dps)
            if obj.main_agent:
                ChangeRadiation(agent=obj.main_agent, time=time, radiation_dps=dps, obj_id=obj.id).post()

    def on_contact_out(self, time, obj):
        super(StationaryRadiation, self).on_contact_out(time=time, obj=obj)
        if isinstance(obj, Unit) and obj.id in self.targets:
            dps = self.targets[obj.id]
            del self.targets[obj.id]
            obj.set_hp(time=time, dps=-dps)
            if obj.main_agent:
                ChangeRadiation(agent=obj.main_agent, time=time, radiation_dps=-dps, obj_id=obj.id).post()
