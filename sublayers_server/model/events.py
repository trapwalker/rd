# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)
log.info('\n\n\n')

from sublayers_server.model.utils import time_log_format
from sublayers_server.model.messages import FireDischargeEffect, StrategyModeInfoObjectsMessage

from functools import total_ordering, wraps, partial


def event_deco(func):
    @wraps(func)
    def closure(self, time, **kw):
        server = (
            hasattr(self, 'server') and self.server or
            hasattr(self, 'agent') and self.agent.server
        )
        assert server
        event = Event(server=server, time=time, callback_after=partial(func, self, **kw))
        event.post()
        return event

    return closure


@total_ordering
class Event(object):
    __str_template__ = '<{self.unactual_mark}{self.classname} #{self.id} [{self.time_str}]>'
    # todo: __slots__
    _unumber_counter = 0

    @classmethod
    def _gen_unumber(cls):
        # todo: thread lock
        cls._unumber_counter += 1
        return cls._unumber_counter

    def __init__(self, server, time, callback_before=None, callback_after=None, comment=None):
        """
        @param sublayers_server.model.event_machine.Server server: Server for new event
        @param float time: Time of event
        @param collections.Callable | None callback_before: Callback to call before on_perform
        @param collections.Callable | None callback_after: Callback to call after on_perform
        @param basestring comment: Debug text
        """
        self.server = server  # todo: Нужно ли хранить ссылку на сервер в событии?
        assert time is not None, 'classname event is {}'.format(self.classname)
        assert time < 3.5e+18, 'classname event is {}'.format(self.classname)
        self.time = time
        self._unumber = self._gen_unumber()
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
        return (self.time, self._unumber) < (other.time, other._unumber)

    def __le__(self, other):
        return (self.time, self._unumber) <= (other.time, other._unumber)

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
                for target in sector.area_target_list:
                    targets.append(target.position(time=self.time))

        # todo: добавить гео-позиционный фильтр агентов
        subj_position = self.obj.position(time=self.time)
        fake_position = Point.polar(max_radius, self.obj.direction(time=self.time) + get_angle_by_side(self.side)) + subj_position
        for agent in self.server.agents.values():
            FireDischargeEffect(agent=agent, pos_subj=subj_position, targets=targets, fake_position=fake_position,
                                time=self.time).post()


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
        target_list = None
        if obj.main_agent is not None:
            target_list = set(obj.main_agent.get_all_visible_objects())
        else:
            target_list = set(obj.visible_objects)
        obj.on_auto_fire_test(target_list=target_list, time=self.time)
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
                time=self.time,
            ).post()


class EnterToMapLocation(Event):
    def __init__(self, agent, obj_id, **kw):
        server = agent.server
        super(EnterToMapLocation, self).__init__(server=server, **kw)
        self.agent = agent
        self.obj_id = obj_id

    def on_perform(self):
        super(EnterToMapLocation, self).on_perform()
        obj = self.server.objects.get(self.obj_id)
        if obj and obj.can_come(agent=self.agent):
            obj.on_enter(agent=self.agent, time=self.time)
        else:
            log.warning('agent %s try to enter the location %s, but access denied', self.agent, obj)


class ReEnterToLocation(Event):
    def __init__(self, agent, location, **kw):
        server = agent.server
        super(ReEnterToLocation, self).__init__(server=server, **kw)
        self.agent = agent
        self.location = location

    def on_perform(self):
        super(ReEnterToLocation, self).on_perform()
        self.location.on_re_enter(agent=self.agent, time=self.time)


class ExitFromMapLocation(Event):
    def __init__(self, agent, obj_id, **kw):
        server = agent.server
        super(ExitFromMapLocation, self).__init__(server=server, **kw)
        self.agent = agent
        self.obj_id = obj_id

    def on_perform(self):
        super(ExitFromMapLocation, self).on_perform()
        obj = self.server.objects.get(self.obj_id)
        if obj:
            obj.on_exit(agent=self.agent, time=self.time)
        else:
            log.warning('agent %s try to exit from location %s, but location not find', self.agent, obj)


class EnterToNPCEvent(Event):
    def __init__(self, agent, npc_type, **kw):
        super(EnterToNPCEvent, self).__init__(server=agent.server, **kw)
        self.agent = agent
        self.npc_type = npc_type

    def on_perform(self):
        super(EnterToNPCEvent, self).on_perform()
        if self.agent.current_location:
            self.agent.current_location.on_enter_npc(agent=self.agent, time=self.time, npc_type=self.npc_type)


class ActivateLocationChats(Event):
    def __init__(self, agent, location, **kw):
        super(ActivateLocationChats, self).__init__(server=agent.server, **kw)
        self.agent = agent
        self.location = location

    def on_perform(self):
        super(ActivateLocationChats, self).on_perform()
        self.location.activate_chats(event=self)


class LoadWorldEvent(Event):
    def on_perform(self):
        super(LoadWorldEvent, self).on_perform()
        self.server.on_load_world(self)


class InsertNewServerZone(Event):
    def __init__(self, zone, **kw):
        super(InsertNewServerZone, self).__init__(**kw)
        self.zone = zone

    def on_perform(self):
        super(InsertNewServerZone, self).on_perform()
        self.server.zones.append(self.zone)


class ShowInventoryEvent(Event):
    def __init__(self, agent, owner_id, **kw):
        super(ShowInventoryEvent, self).__init__(server=agent.server, **kw)
        self.agent = agent
        self.owner_id = owner_id

    def on_perform(self):
        super(ShowInventoryEvent, self).on_perform()
        obj = self.server.objects.get(self.owner_id)
        assert (obj is not None) and (obj.inventory is not None)
        if obj is self.agent.car or obj.is_available(agent=self.agent):
            obj.inventory.add_visitor(agent=self.agent, time=self.time)


class HideInventoryEvent(Event):
    def __init__(self, agent, owner_id, **kw):
        super(HideInventoryEvent, self).__init__(server=agent.server, **kw)
        self.agent = agent
        self.owner_id = owner_id

    def on_perform(self):
        super(HideInventoryEvent, self).on_perform()
        obj = self.server.objects.get(self.owner_id)
        assert (obj is not None) and (obj.inventory is not None)
        obj.inventory.del_visitor(agent=self.agent, time=self.time)


class ItemActionInventoryEvent(Event):
    def __init__(self, agent, start_owner_id, start_pos, end_owner_id, end_pos, **kw):
        super(ItemActionInventoryEvent, self).__init__(server=agent.server, **kw)
        self.agent = agent
        self.start_owner_id = start_owner_id
        self.start_pos = start_pos
        self.end_owner_id = end_owner_id
        self.end_pos = end_pos

    def on_perform(self):
        super(ItemActionInventoryEvent, self).on_perform()

        # Пытаемся получить инвентари и итемы
        start_obj = self.server.objects.get(self.start_owner_id)
        start_inventory = start_obj.inventory
        start_item = start_inventory.get_item(position=self.start_pos)
        if start_item is None:
            return

        end_obj = None
        end_inventory = None
        end_item = None
        if self.end_owner_id is not None:
            # Получить end_item (итем-таргет), на который дропнули start_item
            end_obj = self.server.objects.get(self.end_owner_id, None)
            if end_obj is not None:
                end_inventory = end_obj.inventory
                end_item = end_inventory.get_item(position=self.end_pos)

        if self.agent not in start_inventory.managers:
            return
        if (end_inventory is not None) and (self.agent not in end_inventory.managers):
            return

        if end_item is not None:
            end_item.add_another_item(item=start_item, time=self.time)
        else:
            # Если нет второ итема
            if end_inventory is not None:
                # Положить итем в конечный инвентарь
                start_item.set_inventory(time=self.time, inventory=end_inventory, position=self.end_pos)
            else:
                # Выкидываем лут на карту
                start_obj.drop_item_to_map(item=start_item, time=self.time)


class LootPickEvent(Event):
    def __init__(self, agent, poi_stash_id, **kw):
        super(LootPickEvent, self).__init__(server=agent.server, **kw)
        self.agent = agent
        self.poi_stash_id = poi_stash_id

    def on_perform(self):
        super(LootPickEvent, self).on_perform()
        agent = self.agent
        # получить сундук
        stash = self.server.objects.get(self.poi_stash_id)
        # получить машинку агента
        car = agent.car
        # todo: проверить, является ли stash сундуком
        if stash is None or car is None:
            return
        if abs(stash.position(self.time) - car.position(self.time)) > 50:
            return
        # проходим по инвентарю сундука и перекидываем вещи в инвентарь машины
        for item in stash.inventory.get_items():
            item.set_inventory(time=self.time, inventory=car.inventory)
        # если инвентарь сундука пустой, то удалить сундук
        if stash.inventory.is_empty():
            stash.delete(self.time)


class ItemActivationEvent(Event):
    def __init__(self, agent, owner_id, position, target_id, **kw):
        super(ItemActivationEvent, self).__init__(server=agent.server, **kw)
        self.agent = agent
        self.owner_id = owner_id
        self.position = position
        self.target_id = target_id

    def on_perform(self):
        super(ItemActivationEvent, self).on_perform()

        # пытаемся получить инвентарь и итем
        obj = self.server.objects.get(self.owner_id)
        inventory = obj.inventory
        item = inventory.get_item(position=self.position)
        if item is None:
            return
        event_cls = item.example.activate()
        if event_cls:
            event_cls(server=self.server, time=self.time, item=item, inventory=inventory, target=self.target_id).post()


class StrategyModeInfoObjectsEvent(Event):
    def __init__(self, agent, **kw):
        super(StrategyModeInfoObjectsEvent, self).__init__(server=agent.server, **kw)
        self.agent = agent

    def on_perform(self):
        super(StrategyModeInfoObjectsEvent, self).on_perform()
        objects = self.server.visibility_mng.get_global_around_objects(pos=self.agent.car.position(time=self.time))
        StrategyModeInfoObjectsMessage(objects=objects, time=self.time).post()