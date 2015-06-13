# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)
log.info('\n\n\n')

from sublayers_server.model.utils import time_log_format
from sublayers_server.model.messages import FireDischargeEffect

from functools import total_ordering



@total_ordering
class Event(object):
    __str_template__ = '<{self.unactual_mark}{self.classname} #{self.id} [{self.time_str}]>'
    # todo: __slots__

    def __init__(self, server, time=None, callback_before=None, callback_after=None, comment=None):
        """
        @param float time: Time of event
        """
        self.server = server  # todo: Нужно ли хранить ссылку на сервер в событии?
        assert time is not None, 'classname event is {}'.format(self.classname)
        self.time = time or server.get_time()
        self.actual = True
        self.callback_before = callback_before
        self.callback_after = callback_after
        self.comment = comment  # todo: Устранить отладочную информацию

    def post(self):
        self.server.post_event(self)  # todo: test to atomic construction
        log.info('POST   %s', self)
        self.server.stat_log.s_events_all(time=self.time, delta=1.0)
        self.server.stat_log.s_events_on(time=self.time, delta=1.0)

    def cancel(self):
        if self.actual:
            self.on_cancel()
            self.actual = False
            log.info('CANCEL %s', self)
        else:
            log.warning('Double cancelling event: %s', self)

    def on_cancel(self):
        self.server.stat_log.s_events_on(time=self.time, delta=-1.0)

    def __hash__(self):
        return hash((self.time,))

    def __lt__(self, other):
        return (self.time, id(self)) < (other.time, id(other))

    def __le__(self, other):
        return (self.time, id(self)) <= (other.time, id(other))

    def __nonzero__(self):
        return self.actual

    def __str__(self):
        return self.__str_template__.format(self=self)

    @property
    def unactual_mark(self):
        return '' if self.actual else '~'

    @property
    def time_str(self):
        return time_log_format(self.time)

    @property
    def classname(self):
        return self.__class__.__name__

    __repr__ = __str__

    id = property(id)

    def perform(self):
        """
        Performing event logic.
        """
        assert self.actual
        log.info('RUN    %s', self)
        if self.callback_before is not None:
            self.callback_before(event=self)
        self.on_perform()
        if self.callback_after is not None:
            self.callback_after(event=self)

    def on_perform(self):
        stat_log = self.server.stat_log
        stat_log.s_events_on(time=self.time, delta=-1.0)
        curr_lag = self.server.get_time() - self.time
        assert curr_lag >= 0.0, '{}'.format(curr_lag)
        stat_log.s_events_lag_cur(time=self.time, value=curr_lag)
        stat_log.s_events_lag_mid(time=self.time, value=curr_lag)
        if stat_log.get_metric('s_events_lag_max') < curr_lag:
            stat_log.s_events_lag_max(time=self.time, value=curr_lag)


class Objective(Event):
    __str_template__ = (
        '<{self.unactual_mark}{self.classname}#{self.id} [{self.time_str}] '
        '{self.obj.classname}#{self.obj.id}>')

    def __init__(self, obj, **kw):
        """
        @param sublayers_server.model.base.Object obj: Object of event
        """
        server = obj.server
        assert not obj.limbo
        super(Objective, self).__init__(server=server, **kw)
        self.obj = obj  # todo: weakref?
        obj.events.append(self)

    def on_perform(self):
        super(Objective, self).on_perform()
        self.obj.events.remove(self)

    def on_cancel(self):
        super(Objective, self).on_cancel()
        self.obj.events.remove(self)


class Init(Objective):
    def on_perform(self):
        super(Init, self).on_perform()
        self.obj.on_init(self)


class Die(Objective):
    def on_perform(self):
        super(Die, self).on_perform()
        self.obj.is_alive = False
        self.obj.on_die(self)


class Delete(Objective):
    def on_perform(self):
        super(Delete, self).on_perform()
        self.obj.limbo = True
        self.obj.on_before_delete(event=self)
        log.debug('Termination of %s ', self.obj)
        self.obj.on_after_delete(event=self)


class SearchZones(Objective):

    def on_perform(self):
        super(SearchZones, self).on_perform()
        obj = self.obj
        """@type: sublayers_server.model.base.Observer"""
        obj.on_zone_check(self)
        interval = obj.check_zone_interval
        if obj.is_alive and interval:
            SearchZones(obj=obj, time=self.time + interval).post()


class Contact(Objective):
    __str_template__ = (
        '<{self.unactual_mark}{self.classname}#{self.id} [{self.time_str}] '
        '{self.subj.classname}#{self.subj.id}-'
        '{self.obj.classname}#{self.obj.id}>')

    def __init__(self, obj, subj, **kw):
        """
        @param sublayers_server.model.base.VisibleObject obj: Object of contact
        @param sublayers_server.model.base.Observer subj: Subject of contact
        """

        assert subj.is_alive and not subj.limbo
        self.subj = subj
        super(Contact, self).__init__(obj=obj, **kw)


class ContactInEvent(Contact):
    def on_perform(self):
        super(ContactInEvent, self).on_perform()
        if (self.subj.is_alive and not self.subj.limbo) and (self.obj.is_alive and not self.obj.limbo):
            self.subj.on_contact_in(obj=self.obj, time=self.time)


class ContactOutEvent(Contact):
    def on_perform(self):
        super(ContactOutEvent, self).on_perform()
        if (self.subj.is_alive and not self.subj.limbo) and (self.obj.is_alive and not self.obj.limbo):
            self.subj.on_contact_out(obj=self.obj, time=self.time)


class FireDischargeEvent(Objective):
    def __init__(self, side, **kw):
        super(FireDischargeEvent, self).__init__(**kw)
        self.side = side

    def on_perform(self):
        super(FireDischargeEvent, self).on_perform()
        self.obj.on_fire_discharge(self)


class FireDischargeEffectEvent(Objective):
    def __init__(self, side, **kw):
        super(FireDischargeEffectEvent, self).__init__(**kw)
        self.side = side

    def on_perform(self):
        # todo: правильно ли это?
        from sublayers_server.model.vectors import Point
        from sublayers_server.model.sectors import get_angle_by_side

        super(FireDischargeEffectEvent, self).on_perform()
        targets = []
        max_radius = 0
        for sector in self.obj.fire_sectors:
            if (sector.side == self.side) and sector.is_discharge():
                max_radius = max(max_radius, sector.radius)
                for target in sector.target_list:
                    targets.append(target.position(time=self.time))

        # todo: добавить гео-позиционный фильтр агентов
        subj_position = self.obj.position(time=self.time)
        fake_position = None
        if len(targets) == 0:
            fake_position = Point.polar(max_radius, self.obj.direction(time=self.time) + get_angle_by_side(self.side)) + subj_position
        for agent in self.server.agents.values():
            if len(targets) > 0:
                for target in targets:
                    FireDischargeEffect(agent=agent, pos_subj=subj_position, pos_obj=target).post()
            else:
                FireDischargeEffect(agent=agent, pos_subj=subj_position, pos_obj=fake_position, is_fake=True).post()


class FireAutoEnableEvent(Objective):
    def __init__(self, enable, **kw):
        super(FireAutoEnableEvent, self).__init__(**kw)
        self.enable = enable

    def on_perform(self):
        super(FireAutoEnableEvent, self).on_perform()
        self.obj.on_fire_auto_enable(enable=self.enable, time=self.time)


class FireAutoTestEvent(Objective):
    def on_perform(self):
        super(FireAutoTestEvent, self).on_perform()
        obj = self.obj
        for target in obj.visible_objects:
            obj.on_auto_fire_test(obj=target, time=self.time)
        FireAutoTestEvent(obj=obj, time=self.time + obj.check_auto_fire_interval).post()


class BangEvent(Event):
    def __init__(self, starter, center, radius, damage, **kw):
        server = starter.server
        super(BangEvent, self).__init__(server=server, **kw)
        self.starter = starter
        self.center = center
        self.radius = radius
        self.damage = damage

    def on_perform(self):
        super(BangEvent, self).on_perform()
        from sublayers_server.model.messages import Bang
        from sublayers_server.model.units import Unit

        for obj in self.server.geo_objects:  # todo: GEO-index clipping
            if not obj.limbo and obj.is_alive:  # todo: optimize filtration observers
                if isinstance(obj, Unit):
                    if abs(self.center - obj.position(time=self.time)) < self.radius:
                        obj.set_hp(dhp=self.damage, shooter=self.starter, time=self.time)

        for agent in self.server.agents.values():  # todo: Ограничить круг агентов, получающих уведомление о взрыве, геолокацией.
            Bang(
                position=self.center,
                agent=agent,
            ).post()


class EnterToTown(Event):
    def __init__(self, agent, town_id, **kw):
        server = agent.server
        super(EnterToTown, self).__init__(server=server, **kw)
        self.agent = agent
        self.town_id = town_id

    def on_perform(self):
        super(EnterToTown, self).on_perform()
        town = self.server.objects.get(self.town_id)
        if town and town.can_come(agent=self.agent):
            town.on_enter(agent=self.agent, time=self.time)
        else:
            log.warning('agent %s try to coming in town %s, but access denied', self.agent, town)


class ExitFromTown(Event):
    def __init__(self, agent, town_id, **kw):
        server = agent.server
        super(ExitFromTown, self).__init__(server=server, **kw)
        self.agent = agent
        self.town_id = town_id

    def on_perform(self):
        super(ExitFromTown, self).on_perform()
        town = self.server.objects.get(self.town_id)
        if town:
            town.on_exit(agent=self.agent, time=self.time)
        else:
            log.warning('agent %s try to exit from town %s, but town not find', self.agent, town)


class ActivateTownChats(Event):
    def __init__(self, agent, town, **kw):
        super(ActivateTownChats, self).__init__(server=agent.server, **kw)
        self.agent = agent
        self.town = town

    def on_perform(self):
        super(ActivateTownChats, self).on_perform()
        self.town.activate_chats(event=self)
