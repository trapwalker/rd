# -*- coding: utf-8 -*-

import logging

log = logging.getLogger(__name__)

from sublayers_server.model.utils import time_log_format
from sublayers_server.model.messages import (FireDischargeEffect, StrategyModeInfoObjectsMessage, ChangeAgentBalance,
                                             StartActivateItem, StopActivateItem)
from sublayers_server.model.game_log_messages import (TransactionCancelActivateItemLogMessage,
                                                      TransactionDisableActivateItemLogMessage,
                                                      TransactionDisableActivateItemTimeoutLogMessage)
from sublayers_common.ctx_timer import Timer
from functools import total_ordering, wraps, partial


def event_deco(func):
    @wraps(func)
    def closure(self, time, **kw):
        server = (
            getattr(self, 'server', None) or
            getattr(getattr(self, 'agent', None), 'server', None) or
            kw.get('server', None) or
            getattr(kw.get('agent', None), 'server', None)
        )
        assert server, 'event_deco decorated method called without `server` source'
        # time = kw.pop('time', server.get_time())
        event = Event(server=server, time=time, callback_after=partial(func, self, **kw))
        event.post()
        return event

    closure.sync = func

    return closure


@total_ordering
class Event(object):
    __str_template__ = '<{self.unactual_mark}{self.classname} #{self.id} [{self.time_str}]>'
    # todo: __slots__

    _unumber_counter = 0

    @classmethod
    def _gen_unumber(cls):
        # todo: thread lock
        Event._unumber_counter += 1
        return Event._unumber_counter

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
        self.comment = comment  # todo: Устранить отладочную информацию
        self.callback_before = callback_before
        self.callback_after = callback_after

    def post(self):
        self.server.post_event(self)  # todo: test to atomic construction
        log.debug('POST   %s', self)
        self.server.stat_log.s_events_all(time=self.time, delta=1.0)
        self.server.stat_log.s_events_on(time=self.time, delta=1.0)
        return self

    def cancel(self, time=None):
        if self.actual:
            self.on_cancel(time=time)
            self.actual = False
            log.debug('CANCEL %s', self)
        else:
            log.warning('Double cancelling event: %s', self)

    def on_cancel(self, time=None):
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
        log.debug('RUN    %s', self)

        with Timer(name='event_perform_timer', log_start=None, logger=None, log_stop=None) as event_perform_timer:
            stat_log = self.server.stat_log
            stat_log.s_events_on(time=self.time, delta=-1.0)
            perform_start_time = self.server.get_time()
            curr_lag = perform_start_time - self.time
            assert curr_lag >= 0.0, '{}'.format(curr_lag)
            stat_log.s_events_lag_mid(time=self.time, value=curr_lag)
            stat_log.s_events_lag_max(time=self.time, value=curr_lag, comment=self.classname)
            stat_log.s_events_stat_log(time=self.time, value=curr_lag)

            if self.callback_before is not None:
                self.callback_before(event=self)
            self.on_perform()
            if self.callback_after is not None:
                self.callback_after(event=self)

        cl_name = self.classname
        duration = event_perform_timer.duration
        if self.events_metrics.get(cl_name, None):
            self.events_metrics[cl_name]["count"] += 1
            self.events_metrics[cl_name]["duration"] += duration
            if self.events_metrics[cl_name]["duration_max"] < duration or self.time - self.events_metrics[cl_name]["duration_max_last_upd"] > 20.0:
                self.events_metrics[cl_name]["duration_max"] = duration
                self.events_metrics[cl_name]["duration_max_last_upd"] = self.time

                self.events_metrics[cl_name]["event_perf_time_interval"].append(duration)
                self.events_metrics[cl_name]["event_lag_interval"].append(curr_lag)
        else:
            self.events_metrics[cl_name] = {
                "name": cl_name,
                "count": 1,
                "duration": duration,
                "duration_max": duration,
                "duration_max_last_upd": self.time,

                "event_perf_time_interval": [duration],
                "event_lag_interval": [curr_lag],
            }

    def on_perform(self):
        pass

    events_metrics = dict()


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

    def on_cancel(self, **kw):
        super(Objective, self).on_cancel(**kw)
        self.obj.events.remove(self)


class Init(Objective):
    def on_perform(self):
        super(Init, self).on_perform()
        self.obj.on_init(self)


class Die(Objective):
    def __init__(self, killer, **kw):
        super(Die, self).__init__(**kw)
        self.killer = killer

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


class Save(Objective):
    def on_perform(self):
        super(Save, self).on_perform()
        self.obj.on_save(time=self.time)


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
    def __init__(self, side, weapon_example, **kw):
        super(FireDischargeEffectEvent, self).__init__(**kw)
        self.side = side
        self.weapon_example = weapon_example

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
        fake_position = Point.polar(max_radius,
                                    self.obj.direction(time=self.time) + get_angle_by_side(self.side)) + subj_position
        for agent in self.server.agents.values():
            FireDischargeEffect(agent=agent, pos_subj=subj_position, targets=targets, fake_position=fake_position,
                                time=self.time, self_shot=(agent is self.obj.main_agent),
                                weapon_animation=self.weapon_example.weapon_animation,
                                weapon_audio=self.weapon_example.weapon_audio).post()


class FireAutoEnableEvent(Objective):
    def __init__(self, enable, **kw):
        super(FireAutoEnableEvent, self).__init__(**kw)
        self.enable = enable

    def on_perform(self):
        super(FireAutoEnableEvent, self).on_perform()
        self.obj.on_fire_auto_enable(enable=self.enable, time=self.time, event=self)


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
    def __init__(self, damager, center, radius, damage, **kw):
        server = damager.server
        super(BangEvent, self).__init__(server=server, **kw)
        self.damager = damager
        self.center = center
        self.radius = radius
        self.damage = damage

    def on_perform(self):
        super(BangEvent, self).on_perform()
        from sublayers_server.model.messages import Bang
        from sublayers_server.model.units import Unit

        list_targets = []

        objects = self.server.visibility_mng.get_around_objects(pos=self.center, time=self.time)
        for obj in objects:
            if not obj.limbo and obj.is_alive:
                if isinstance(obj, Unit):
                    dist = abs(self.center - obj.position(time=self.time))
                    if dist < self.radius:
                        dhp = self.damage * (1.0 - obj.params.get('p_armor').value / 100.)
                        obj.set_hp(dhp=dhp, shooter=self.damager, time=self.time)
                        list_targets.append(obj)

        self.damager.main_agent.on_bang_damage(obj=self.damager, targets=list_targets, time=self.time)

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
        if obj and obj.can_come(agent=self.agent, time=self.time):
            obj.on_enter(agent=self.agent, event=self)
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
        self.location.on_re_enter(agent=self.agent, event=self)


class ExitFromMapLocation(Event):
    def __init__(self, agent, **kw):
        server = agent.server
        super(ExitFromMapLocation, self).__init__(server=server, **kw)
        self.agent = agent

    def on_perform(self):
        super(ExitFromMapLocation, self).on_perform()
        if self.agent.current_location:
            self.agent.current_location.on_exit(agent=self.agent, event=self)
        else:
            log.warning('agent %s try to exit from location, but location is not found', self.agent)


class EnterToNPCEvent(Event):
    def __init__(self, agent, npc, **kw):
        super(EnterToNPCEvent, self).__init__(server=agent.server, **kw)
        self.agent = agent
        self.npc = npc

    def on_perform(self):
        super(EnterToNPCEvent, self).on_perform()
        if self.agent.current_location:
            self.agent.current_location.on_enter_npc(event=self)


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
        # assert (obj is not None) and (obj.inventory is not None)
        if obj is not None and obj.inventory is not None and (
                obj is self.agent.car or obj.is_available(agent=self.agent, time=self.time)):
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
    def __init__(self, agent, start_owner_id, start_pos, end_owner_id, end_pos, count, **kw):
        super(ItemActionInventoryEvent, self).__init__(server=agent.server, **kw)
        self.agent = agent
        self.start_owner_id = start_owner_id
        self.start_pos = start_pos
        self.end_owner_id = end_owner_id
        self.end_pos = end_pos
        self.count = count

    def on_perform(self):
        super(ItemActionInventoryEvent, self).on_perform()

        # Пытаемся получить инвентари и итемы
        start_obj = self.server.objects.get(self.start_owner_id)
        if start_obj is None:
            return
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

        if end_item is not None:  # досыпание
            # todo: сделать смену стеков (когда полный на неполный и наоборот)
            self.count = start_item.val(t=self.time) if self.count < 0 else self.count
            end_item.add_another_item(item=start_item, time=self.time, count=self.count)
        else:  # деление
            if end_inventory is not None:  # положить в инвентарь
                if self.count < 0 or start_item.val(t=self.time) <= self.count:
                    start_item.set_inventory(time=self.time, inventory=end_inventory, position=self.end_pos)
                else:
                    start_item.div_item(count=self.count, time=self.time, inventory=end_inventory,
                                        position=self.end_pos)
            else:  # выбрасывание на карту
                drop_item = start_item if self.count < 0 else start_item._div_item(count=self.count, time=self.time)
                start_obj.drop_item_to_map(item=drop_item, time=self.time)


class TakeAllInventoryEvent(Event):
    def __init__(self, agent, owner_id, **kw):
        super(TakeAllInventoryEvent, self).__init__(server=agent.server, **kw)
        self.agent = agent
        self.owner_id = owner_id

    def on_perform(self):
        super(TakeAllInventoryEvent, self).on_perform()

        # Получаем свой инвентарь
        end_inventory = self.agent.car.inventory

        # Пытаемся получить инвентарь и итем
        start_obj = self.server.objects.get(self.owner_id)
        if start_obj is None:
            return
        start_inventory = start_obj.inventory
        if (start_inventory is None) or \
           (self.agent not in start_inventory.managers) or \
           (start_inventory is end_inventory):
            return
        items = start_inventory.get_all_items()

        for item_rec in items:
            # if not item_rec['item'].set_inventory(inventory=end_inventory, time=self.time):
            #     return
            # Попробовать раскидать каждый итем
            item_rec['item'].set_inventory_with_scatter(inventory=end_inventory, time=self.time)


class MassiveLootAroundEvent(Event):
    def __init__(self, agent, **kw):
        super(MassiveLootAroundEvent, self).__init__(server=agent.server, **kw)
        self.agent = agent

    def on_perform(self):
        super(MassiveLootAroundEvent, self).on_perform()
        car = self.agent.car
        if not car:
            return
        car_inventory = car.inventory  # Получаем свой инвентарь

        # Обойти все видимые объекты и лут рядом с собой отсортировать по удалённости
        from sublayers_server.model.poi_loot_objects import POIContainer
        car_position = car.position(self.time)
        containers = []  # Список пар (container, distance)
        for vo in car.visible_objects:
            if isinstance(vo, POIContainer):
                containers.append((vo, car_position.distance(vo.position(self.time))))

        # Сортировка пар (container, distance) по расстоянию
        containers.sort(key=lambda x: x[1])

        # Собираем итемы пока не переполнится наш инвентарь
        for container, distance in containers:
            container_inventory = container.inventory
            if container_inventory and self.agent in container_inventory.managers and container_inventory is not car_inventory:
                items = container_inventory.get_all_items()
                for item_rec in items:
                    # if not item_rec['item'].set_inventory(inventory=car_inventory, time=self.time):
                    #     return
                    # Попробовать раскидать каждый итем
                    item_rec['item'].set_inventory_with_scatter(inventory=car_inventory, time=self.time)


class TakeItemInventoryEvent(Event):
    def __init__(self, agent, owner_id, position, other_id, **kw):
        super(TakeItemInventoryEvent, self).__init__(server=agent.server, **kw)
        self.agent = agent
        self.owner_id = owner_id
        self.position = position
        self.other_id = other_id

    def on_perform(self):
        super(TakeItemInventoryEvent, self).on_perform()

        # Получаем свой инвентарь
        end_obj = self.server.objects.get(self.other_id)
        if end_obj is None:
            return
        end_inventory = end_obj.inventory

        # Пытаемся получить инвентарь и итем
        start_obj = self.server.objects.get(self.owner_id)
        if start_obj is None:
            return
        start_inventory = start_obj.inventory
        if (start_inventory is None) or \
           (self.agent not in start_inventory.managers) or \
           (start_inventory is end_inventory):
            return
        start_item = start_inventory.get_item(position=self.position)
        if start_item is None:
            return

        start_item.set_inventory(inventory=end_inventory, time=self.time)


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


class ItemPreActivationEvent(Event):
    def __init__(self, agent, owner_id, position, target_id, **kw):
        super(ItemPreActivationEvent, self).__init__(server=agent.server, **kw)
        self.agent = agent
        self.owner_id = owner_id
        self.position = position
        self.target_id = target_id

    def on_perform(self):
        super(ItemPreActivationEvent, self).on_perform()
        # пытаемся получить инвентарь и итем
        obj = self.server.objects.get(self.owner_id)
        if obj is None:
            return
        inventory = obj.inventory
        if not (inventory is self.agent.inventory) or (self.agent.inventory is None):
            return
        item = inventory.get_item(position=self.position)
        if item is None:
            return
        event_cls = item.example.activate()
        if event_cls:
            # todo: вынести константу времени задержки между активациями в настройки
            if (obj.last_activation_time is not None) and (abs(self.time - obj.last_activation_time) < 1):
                TransactionDisableActivateItemTimeoutLogMessage(agent=self.agent, time=self.time, item=item.example).post()
                return

            if not item.example.can_activate(time=self.time, agent_model=self.agent):
                TransactionDisableActivateItemLogMessage(agent=self.agent, time=self.time, item=item.example).post()
                return

            if obj.current_item_action:
                obj.current_item_action.cancel(time=self.time)
            activate_time = item.example.get_activate_time(agent_model=self.agent)
            StartActivateItem(agent=self.agent, time=self.time, item=item, activate_time=activate_time).post()
            obj.current_item_action = ItemActivationEvent(agent=self.agent,
                                                          owner_id=self.owner_id,
                                                          position=self.position,
                                                          target_id=self.target_id,
                                                          item=item,
                                                          time=self.time + activate_time)
            obj.current_item_action.post()


class ItemActivationEvent(Event):
    def __init__(self, agent, owner_id, position, target_id, item=None, **kw):
        super(ItemActivationEvent, self).__init__(server=agent.server, **kw)
        self.agent = agent
        self.owner_id = owner_id
        self.position = position
        self.target_id = target_id
        self.item = item

    def on_perform(self):
        super(ItemActivationEvent, self).on_perform()

        # Пытаемся получить инвентарь и итем
        obj = self.server.objects.get(self.owner_id)
        if obj is None:
            return
        inventory = obj.inventory
        item = inventory.get_item(position=self.position)
        if item is None:
            return

        # Отключаем процесс активвации
        StopActivateItem(agent=self.agent, time=self.time, item=self.item).post()
        obj.current_item_action = None

        # Если это не тот итем который мы начинали активировать то ниче не делать
        if (self.item is not None) and not (self.item is item):
            return

        event_cls = item.example.activate()
        if event_cls:
            obj.last_activation_time = self.time
            event_cls(agent=self.agent, time=self.time, item=item, inventory=inventory, target=self.target_id).post()

    def on_cancel(self, time):
        super(ItemActivationEvent, self).on_cancel(time)
        obj = self.server.objects.get(self.owner_id)
        item = self.item
        if obj is not None:
            obj.current_item_action = None
            if item is None:
                inventory = obj.inventory
                item = inventory.get_item(position=self.position)

        StopActivateItem(agent=self.agent, time=time, item=self.item).post()
        if item is not None:
            TransactionCancelActivateItemLogMessage(agent=self.agent, time=time, item=item.example).post()


class StrategyModeInfoObjectsEvent(Event):
    def __init__(self, agent, **kw):
        super(StrategyModeInfoObjectsEvent, self).__init__(server=agent.server, **kw)
        self.agent = agent

    def on_perform(self):
        super(StrategyModeInfoObjectsEvent, self).on_perform()
        car = self.agent.car
        if car is not None:
            objects = self.server.visibility_mng.get_global_around_objects(pos=car.position(time=self.time),
                                                                           time=self.time)
            StrategyModeInfoObjectsMessage(agent=self.agent, objects=objects, time=self.time).post()


# данный эвент сейчас не доступен !
class AgentTestEvent(Event):
    def __init__(self, agent, **kw):
        super(AgentTestEvent, self).__init__(server=agent.server, **kw)
        self.agent = agent

    def on_perform(self):
        super(AgentTestEvent, self).on_perform()
        agent = self.agent
        car = agent.car
        AgentTestEvent(agent=agent, time=self.time + 2.0).post()
        if car:
            # Определить, есть ли у машинки в авто-секторах цели, есть ли цели в оружиях
            sector_targets = []
            weapon_targets = []
            for sector in car.fire_sectors:
                if sector.is_auto():
                    sector_targets = sector_targets + sector.target_list
                    for weapon in sector.weapon_list:
                        weapon_targets = weapon_targets + weapon.targets

            # Определить, тратятся ли патроны из инвентаря
            changed_items = []
            for item in car.inventory.get_items():
                if item.dvs != 0.0:
                    changed_items.append(item)

            len_ch_item = len(changed_items)
            len_weapons_t = len(weapon_targets)
            len_sectors_t = len(sector_targets)

            # Теперь проверки и логирование
            if len_weapons_t != len_sectors_t:
                agent.log.info(
                    'Error! 1 sector_targets len {}  !=  weapon targets len {}'.format(len_sectors_t, len_weapons_t))

            if ((len_weapons_t > 0 or len_sectors_t > 0) and len_ch_item == 0) or (
                (len_weapons_t == 0 or len_sectors_t == 0) and len_ch_item > 0):
                agent.log.info('Error! 2 sector_targets<{}> weapon_targets<{}> changed_items<{}>'.format(len_sectors_t,
                                                                                                         len_weapons_t,
                                                                                                         len_ch_item))

            if len_ch_item:
                if len_weapons_t == 0 or len_sectors_t == 0:
                    agent.log.info(
                        'Error! 3 sector_targets<{}> weapon_targets<{}> changed_items<{}>'.format(len_sectors_t,
                                                                                                  len_weapons_t,
                                                                                                  len_ch_item))

                    # agent.log.info('Error! end!!! sector_targets<{}> weapon_targets<{}> changed_items<{}>'.format(len_sectors_t, len_weapons_t, len_ch_item))
