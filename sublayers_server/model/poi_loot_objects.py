# -*- coding: utf-8 -*-
import logging
log = logging.getLogger(__name__)

from sublayers_server.model.events import Event, Objective
from sublayers_server.model.base import Observer
from sublayers_server.model.inventory import Inventory, ItemState
from sublayers_server.model.vectors import Point

from sublayers_server.model.state import MotionState
from sublayers_server.model.motion_task import MotionTask
from sublayers_server.model.parameters import Parameter


class DelPOIContainerEvent(Objective):
    def __init__(self, container, **kw):
        super(DelPOIContainerEvent, self).__init__(obj=container, **kw)
        self.container = container

    def on_perform(self):
        super(DelPOIContainerEvent, self).on_perform()
        if len(self.container.inventory.managers) > 0 and self.server.server_mode == "basic":
            DelPOIContainerEvent(container=self.container, time=self.time + self.container.life_time).post()
        else:
            self.container.delete(time=self.time)


class CreatePOILootEvent(Event):
    def __init__(self, server, time, poi_cls, example, inventory_size, position, life_time, items, connect_radius=50):
        super(CreatePOILootEvent, self).__init__(server=server, time=time)
        self.poi_cls = poi_cls
        self.example = example
        self.inventory_size = inventory_size
        self.position = position
        self.life_time = life_time
        self.items = items
        self.connect_radius = connect_radius

    def on_perform(self):
        super(CreatePOILootEvent, self).on_perform()
        objs = self.server.visibility_mng.get_around_objects(pos=self.position, time=self.time)
        stash = None
        for obj in objs:
            if isinstance(obj, POILoot):
                if obj.position(time=self.time).distance(target=self.position) <= self.connect_radius:
                    stash = obj
                    free_size = stash.inventory.max_size - stash.inventory.get_item_count()
                    if free_size < len(self.items):
                        stash.inventory.inc_max_size(d_size=(len(self.items) - free_size), time=self.time)
                    break

        if not stash:
            stash = self.poi_cls(server=self.server, time=self.time, example=self.example,
                                 inventory_size=self.inventory_size, position=self.position,
                                 life_time=self.life_time)

        # заполнить инвентарь сундука
        for item in self.items:
            item.set_inventory(time=self.time, inventory=stash.inventory)


class CreatePOICorpseEvent(Event):
    def __init__(self, server, time, example, inventory_size, position, life_time, items, connect_radius=50,
                 sub_class_car=None, car_direction=None, donor_v=None, donor_example=None, agent_viewer=None):
        super(CreatePOICorpseEvent, self).__init__(server=server, time=time)
        self.example = example
        self.inventory_size = inventory_size
        self.position = position
        self.life_time = life_time
        self.items = items
        self.connect_radius = connect_radius
        self.sub_class_car = sub_class_car
        self.car_direction = car_direction
        self.donor_v = donor_v
        self.donor_example = donor_example
        self.agent_viewer = agent_viewer

    def on_perform(self):
        super(CreatePOICorpseEvent, self).on_perform()
        stash = POICorpse(server=self.server, time=self.time, example=self.example,
                          inventory_size=self.inventory_size, position=self.position,
                          life_time=self.life_time, sub_class_car=self.sub_class_car,
                          car_direction=self.car_direction, donor_v=self.donor_v,
                          donor_example=self.donor_example, agent_viewer=self.agent_viewer)
        # заполнить инвентарь сундука
        for item in self.items:
            item.set_inventory(time=self.time, inventory=stash.inventory)


class CheckPOILootEmptyEvent(Event):
    def __init__(self, server, time, poi_loot):
        super(CheckPOILootEmptyEvent, self).__init__(server=server, time=time)
        self.poi_loot = poi_loot

    def on_perform(self):
        super(CheckPOILootEmptyEvent, self).on_perform()
        if self.poi_loot.inventory.get_item_count() == 0:
            self.poi_loot.delete(time=self.time)


class POIContainer(Observer):
    def __init__(self, server, time, life_time=None, example=None, inventory_size=None, position=None, **kw):
        assert (example is not None) or ((inventory_size is not None) and (position is not None))
        if example is None:
            example = server.reg['poi/stash'].instantiate(
                position=position, 
                fixtured=False,
            )
            self.inventory_size = inventory_size
        super(POIContainer, self).__init__(server=server, time=time, example=example, **kw)
        self.example.inventory.size = self.inventory_size
        self.inventory = Inventory(max_size=self.example.inventory.size, owner=self)
        self.load_inventory(time=time)
        self.life_time = life_time
        if life_time:
            DelPOIContainerEvent(time=time + life_time, container=self).post()

    def is_available(self, agent, time):
        return agent.car in self.visible_objects

    def on_contact_in(self, time, obj):
        super(POIContainer, self).on_contact_in(time=time, obj=obj)
        if hasattr(obj, 'owner') and obj.owner:
            self.inventory.add_manager(agent=obj.owner)

    def on_contact_out(self, time, obj):
        super(POIContainer, self).on_contact_out(time=time, obj=obj)
        if hasattr(obj, 'owner') and obj.owner:
            self.inventory.del_visitor(agent=obj.owner, time=time)
            self.inventory.del_manager(agent=obj.owner)

    def load_inventory(self, time):
        for item_example in self.example.inventory.items:
            ItemState(server=self.server, time=time, example=item_example, count=item_example.amount)\
                .set_inventory(time=time, inventory=self.inventory, position=item_example.position)

    def drop_item_to_map(self, item, time):
        CreatePOILootEvent(server=self.server, time=time, poi_cls=POILoot, example=None,
                           inventory_size=1,
                           position=Point.random_gauss(self.position(time), 10),
                           life_time=self.server.poi_loot_objects_life_time, items=[item]).post()


class POILoot(POIContainer):
    def __init__(self, **kw):
        super(POILoot, self).__init__(**kw)
        self.inventory.add_change_call_back(method=self.change_inventory)

    def drop_item_to_map(self, item, time):
        pass

    def change_inventory(self, inventory, time):
        if inventory.get_item_count() == 0:
            # todo: с этим эвентом иногда бывают проблемы. Возможно сделать не эвентом
            CheckPOILootEmptyEvent(server=self.server, time=time, poi_loot=self).post()

    def on_before_delete(self, event):
        self.inventory.del_change_call_back(method=self.change_inventory)
        super(POILoot, self).on_before_delete(event=event)


class POICorpse(POIContainer):
    def __init__(self, time, sub_class_car, car_direction, donor_v, donor_example, agent_viewer=None, **kw):
        super(POICorpse, self).__init__(time=time, **kw)
        self.sub_class_car = sub_class_car
        self.car_direction = car_direction
        self.donor_v = donor_v
        self.donor_param_aggregate = donor_example.param_aggregate(example_agent=None)
        self.tasks = []
        self.agent_viewer = agent_viewer  # Для шаринга видимости этому агенту некоторое время
        self.agent_login = "" if not agent_viewer else agent_viewer.print_login()

        self.agent_donor = agent_viewer  # Для запоминания чей именно это труп
        self.donor_car = donor_example  # Для запоминания example мёртвой машинки

        self.state = MotionState(t=time, **self.init_state_params())
        self.cur_motion_task = None

        v_forward = self.donor_param_aggregate['v_forward']
        self.max_control_speed = self.donor_param_aggregate['max_control_speed']
        assert v_forward <= self.max_control_speed
        Parameter(original=v_forward / self.max_control_speed, min_value=0.05, max_value=1.0, owner=self, name='p_cc')

    def init_state_params(self):
        return dict(
            p=self._position,
            fi=self.car_direction,
            r_min=self.donor_param_aggregate['r_min'],
            ac_max=self.donor_param_aggregate['ac_max'],
            v_forward=self.donor_param_aggregate['max_control_speed'],
            v_backward=self.donor_param_aggregate['v_backward'],
            a_forward=self.donor_param_aggregate['a_forward'],
            a_backward=self.donor_param_aggregate['a_backward'],
            a_braking=self.donor_param_aggregate['a_braking'],
            v=self.donor_v,
        )

    def delete_self_from_viewer(self, event):
        if self.agent_viewer:
            self.agent_viewer.drop_obj(obj=self, time=event.time)
            self.agent_viewer = None

    def on_init(self, event):
        super(POICorpse, self).on_init(event)
        self.set_motion(time=event.time, cc=0.0)
        if self.agent_viewer:
            self.agent_viewer.append_obj(obj=self, time=event.time)
            Objective(obj=self, time=event.time + 4.0, callback_after=self.delete_self_from_viewer).post()

    def on_before_delete(self, event):
        self.delete_self_from_viewer(event=event)
        super(POICorpse, self).on_before_delete(event=event)

    def as_dict(self, time):
        d = super(POICorpse, self).as_dict(time=time)
        d.update(
            state=self.state.export(),
            v_forward=self.state.v_forward,
            v_backward=self.state.v_backward,
            p_cc=self.params.get('p_cc').value,
            p_obs_range_rate_max=1.0,
            p_obs_range_rate_min=1.0,
            sub_class_car=self.sub_class_car,
            car_direction=self.car_direction,
            agent_login=self.agent_login,
        )
        return d

    def is_available(self, agent, time):
        res = super(POICorpse, self).is_available(agent=agent, time=time)
        return res and self.v(time) == 0 and self.a() == 0

    def set_motion(self, time, target_point=None, cc=None, turn=None, comment=None):
        assert (turn is None) or (target_point is None)
        MotionTask(owner=self, target_point=target_point, cc=cc, turn=turn, comment=comment).start(time=time)

    def on_start(self, event):
        pass

    def on_stop(self, event):
        pass

    def v(self, time):
        return self.state.v(t=time)

    def a(self):
        return self.state.a

    def position(self, time):
        return self.state.p(t=time)

    def direction(self, time):
        return self.state.fi(t=time)