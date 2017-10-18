# -*- coding: utf-8 -*-
from __future__ import absolute_import, print_function
import sys
import logging
log = logging.getLogger(__name__)

from sublayers_server.model.registry_me import classes  # Не удалять этот импорт! Авторегистрация классов.

from sublayers_server.model.registry_me.classes.weapons import Weapon
from sublayers_server.model.registry_me.tree import (
    connect, get_global_registry, RegistryLinkField, StringField, STAT,
)

import random
from ctx_timer import Timer, T


class RandomizeCarException(Exception):
    pass


class RandomizeCarWeaponException(Exception):
    pass


class RandomizeExamples(object):
    registry = None
    cache_car_level = None
    agent_role_class_list = None

    @classmethod
    def init_cache(cls, registry):
        cls.registry = registry
        cls.cache_car_level = dict()
        randomize_cars_by_lvl = registry.get('/registry/world_settings').randomize_cars_by_lvl
        for lvl_rec in randomize_cars_by_lvl:
            cars = [car for car in lvl_rec.cars]
            weapons = [weapon for weapon in lvl_rec.weapons]
            tuner_items = [item for item in lvl_rec.tuner_items]
            cls.cache_car_level[lvl_rec.level] = dict(level=lvl_rec.level, cars=cars, weapons=weapons, tuner_items=tuner_items)
            log.debug('RandomizeCarExample: %s added to cache: cars=%s, weapons=%s', lvl_rec.level, len(cars), len(weapons))

        cls.agent_role_class_list = [k for k in registry.get('/registry/world_settings').role_class_order]
        assert cls.agent_role_class_list, 'RandomizeExamples: init_cache: role class list is empty'


    @classmethod
    def get_random_car(cls, cars, weapons, tuner_items=None, car_params=None):
        if cls.registry is None:
            raise Exception('RandomizeCarExample: registry not init')

        # Подготовка и выбор машинки
        car_proto = random.choice(cars)
        if isinstance(car_proto, RegistryLinkField):
            pass
        if isinstance(car_proto, basestring) or isinstance(car_proto, StringField):
            car_proto = cls.registry.get(car_proto)
        if not car_proto:
            raise RandomizeCarException('Car Proto dont resolve or not found. Cars: {}'.format(cars))
        # log.debug('RandomizeCarExample Choise: %s', car_proto.uri)

        # Подготовка списка оружия
        if weapons:
            if isinstance(weapons[0], basestring) or isinstance(weapons[0], StringField):
                weapons = [cls.registry.get(w) for w in weapons]
        # if not weapons or not isinstance(weapons[0], Weapon):
        #     raise RandomizeCarWeaponException('Weapons list empty.')

        # Подготовка айтемов тюнинга
        if tuner_items:
            if isinstance(tuner_items[0], basestring) or isinstance(tuner_items[0], StringField):
                tuner_items = [cls.registry.get(item) for item in tuner_items]
            # Поиск подходящих для данной машинки тюнинг айтемов
            car_node_hash = car_proto.node_hash()
            tuner_items = [item for item in tuner_items if item.get_view(car_node_hash)]
        else:
            tuner_items = []
        # todo: пройтись по слотам и установить нескольок айтемов из тех, что есть в tuner_items


        # Формирование карты оружия
        one_front_direcrion = False  # Установлен ли хоть один слот вперед
        get_flags = '{}_f'.format
        armorer_map = []  # dict(slot_name: slot_name, direction = direction)
        ammo_map = []  # Список патронов для орудий - здесь значимы keys
        for slot_name in car_proto.iter_armorer_slots_name():
            flags, weight = getattr(car_proto, get_flags(slot_name)).split('_')
            if not one_front_direcrion and 'F' in flags:  # Если ни разу не устанавливали one_front_direcrion
                direction = 'F'
            else:
                direction = random.choice(flags)
            available_weapons = [w for w in weapons if w.weight_class <= weight]
            if not available_weapons:
                log.warning("Dont found available weapons for slot<%s> with weight=%s in car: %s", slot_name, weight, car_proto.uri)
                continue
            weapon = random.choice(available_weapons)
            # log.debug("%s   %s    %s   =>> %s  %s", slot_name, flags, weight, weapon.weight_class, weapon.uri)
            if not one_front_direcrion and direction == 'F':
                one_front_direcrion = True
            armorer_map.append(dict(slot_name=slot_name, direction=direction, weapon=weapon))
            ammo = weapon.ammo
            if ammo not in ammo_map:
                ammo_map.append(ammo)

        # if not armorer_map:
        #     raise RandomizeCarWeaponException('Weapons for setup not found: %s  = >> %s', car_proto.uri, weapons)

        if car_proto.inventory.size < len(ammo_map):
            raise RandomizeCarException('Ammo len = %s, Inventory size = %s ', len(ammo_map), car_proto.inventory.size)

        ############ Инстанцирование ############
        # Машинка и её потребление
        car_params = car_params or dict()
        p_fuel_rate = car_params.pop('p_fuel_rate', 0.0)
        car = car_proto.instantiate(p_fuel_rate=p_fuel_rate, **car_params)
        car.randomize_params(options=dict(rand_modifier_p_armor=1.0))

        # Установка орудий
        for record in armorer_map:
            # Не нужно делать isinstance (Canon или MachineGun) из-за особенностей наследования
            weapon_ex = record['weapon'].instantiate(direction=record['direction'], ammo_per_shot=0, ammo_per_second=0)
            setattr(car, record['slot_name'], weapon_ex)

        # Закидывание патронов в инвентарь машинки
        for ammo in ammo_map:
            ammo_ex = ammo.instantiate(amount=random.randint(1, ammo.stack_size))
            car.inventory.items.append(ammo_ex)

        if not one_front_direcrion:
            log.warning('No One slot direction Front: %s', car_proto.uri)

        return car

    @classmethod
    def get_random_car_level(cls, level, cars=None, weapons=None, car_params=None):
        if cls.registry is None:
            raise Exception('RandomizeCarExample: registry not init')
        level = int(level)
        if level < 0:
            raise Exception('RandomizeCarExample: level = %s', level)

        cache = cls.cache_car_level
        level_recod = cache.get(level, None)
        candidate_cars = cars or level_recod['cars']
        candidate_weapons = weapons if isinstance(weapons, list) else level_recod['weapons']

        if level_recod and candidate_cars:
            return cls.get_random_car(cars=candidate_cars, weapons=candidate_weapons,
                                      tuner_items=level_recod['tuner_items'], car_params=car_params)
        else:
            # log.warning('RandomizeCarExample: not found cache for level: %s. Try prev level.', level)
            return cls.get_random_car_level(level=level-1, cars=cars, weapons=weapons, car_params=car_params)

    @classmethod
    def get_random_agent(cls, level, time, karma_min=0, karma_max=0, agent_params=None):
        agent_proto = cls.registry.get('/registry/agents/user/ai_quest')
        example_profile = agent_proto.instantiate(name='', role_class=None, **(agent_params or dict()))
        role_class = random.choice(cls.agent_role_class_list)

        example_profile.set_karma(time=time, value=random.randint(karma_min, karma_max))

        need_points = level * 10 + random.randint(0, 9)
        exp = example_profile.exp_table.get_need_exp_by_points(need_points)
        example_profile.set_exp(time=time, value=exp)
        total_sum = need_points + role_class.start_free_point_skills

        # Выбор скила, куда уйдёт бОльшая часть очков
        skills_dict = dict(driving=0, shooting=0, masking=0, leading=0, trading=0, engineering=0)
        skill_dict_keys = skills_dict.keys()
        if role_class.class_skills:
            class_target_skill = role_class.class_skills[0].target
            example_profile.set_role_class(role_class_ex=role_class, registry=cls.registry)
            # 20-40% сразу в целевое
            if class_target_skill in skill_dict_keys:
                skill_count = int(round(total_sum * random.randint(20, 40) / 100.))
                total_sum -= skill_count
                skills_dict[class_target_skill] += skill_count

        # Распределение очков
        while total_sum > 0:
            skills_dict[random.choice(skill_dict_keys)] += 1
            total_sum -= 1

        # Установка очков
        for skill in skill_dict_keys:
            attr = getattr(example_profile, skill)
            attr.value += skills_dict[skill]

        # log.debug('role_class = %s  need_points = %s  total_sum = %s', role_class.uri, need_points, total_sum)
        # log.debug('skills_dict = %s', skills_dict)

        # todo: прокачать перки. Из списка скорее всего

        return example_profile

if __name__ == '__main__':
    sys.path.append('../../..')
    log = logging.getLogger()
    try:
        import coloredlogs
        coloredlogs.DEFAULT_FIELD_STYLES['levelname']['color'] = 'green'
        coloredlogs.install(level=logging.DEBUG, fmt='%(levelname)-8s| %(message)s')
    except ImportError:
        log.level = logging.DEBUG
        _hndl = logging.StreamHandler(sys.stderr)
        _hndl.setFormatter(logging.Formatter('%(levelname)-8s| %(message)s'))
        log.addHandler(_hndl)


def test5(reload=True, save_loaded=True):
    import random
    import sublayers_server.model.registry_me.classes
    from sublayers_server.model.registry_me.classes.agents import Agent
    reg = get_global_registry(path=u'../../../sublayers_world', reload=reload, save_loaded=save_loaded)

    log.debug('Start expanding reg')
    # with T('reg Expand_links'):
    #     reg.root.rl_resolve()

    RandomizeExamples.init_cache(registry=reg)
    agent = RandomizeExamples.get_random_agent(level=3, time=1)


    log.debug('driving = %s', agent.driving.calc_value())
    log.debug('shooting = %s', agent.shooting.calc_value())
    log.debug('masking = %s', agent.masking.calc_value())
    log.debug('leading = %s', agent.leading.calc_value())
    log.debug('trading = %s', agent.trading.calc_value())
    log.debug('engineering = %s', agent.engineering.calc_value())

    log.debug('level = %s', agent.get_lvl())


    globals().update(locals())


if __name__ == '__main__':
    import math
    db_name = 'rd' #+ 't'
    db = connect(db=db_name)
    log.info('Use {db_name!r} db'.format(**locals()))

    rel = 0

    test5(reload=rel, save_loaded=True)

    #its = sorted([(v, k) for k, v in c.items()], reverse=True)

    # print('DONE')
    if rel:
        print(STAT.s)
    #field_getter_decorator._debug = True

    # print('Ok')
