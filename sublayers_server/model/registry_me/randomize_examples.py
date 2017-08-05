# -*- coding: utf-8 -*-
from __future__ import absolute_import, print_function
import sys
import logging
log = logging.getLogger(__name__)

from sublayers_server.model.registry_me import classes  # Не удалять этот импорт! Авторегистрация классов.

from sublayers_server.model.registry_me.classes.weapons import Weapon
from sublayers_common.ctx_timer import Timer, T
from sublayers_server.model.registry_me.tree import (
    connect, get_global_registry, ListField, RegistryLinkField, StringField, STAT,
)

import random


class RandomizeCarException(Exception):
    pass


class RandomizeCarWeaponException(Exception):
    pass


class RandomizeExamples(object):
    registry = None
    cache_car_level = None

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
        if not weapons or not isinstance(weapons[0], Weapon):
            raise RandomizeCarWeaponException('Weapons list empty.')

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

        if not armorer_map:
            raise RandomizeCarWeaponException('Weapons for setup not found: %s  = >> %s', car_proto.uri, weapons)

        if car_proto.inventory.size < len(ammo_map):
            raise RandomizeCarException('Ammo len = %s, Inventory size = %s ', len(ammo_map), car_proto.inventory.size)

        ############ Инстанцирование ############
        # Машинка и её потребление
        car_params = car_params or dict()
        p_fuel_rate = car_params.pop('p_fuel_rate', 0.0)
        car = car_proto.instantiate(p_fuel_rate=p_fuel_rate, **car_params)

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
    def get_random_car_level(cls, level, car_params=None):
        if cls.registry is None:
            raise Exception('RandomizeCarExample: registry not init')
        level = int(level)
        if level < 0:
            raise Exception('RandomizeCarExample: level = %s', level)

        cache = cls.cache_car_level
        level_recod = cache.get(level, None)
        if level_recod and level_recod['cars'] and level_recod['weapons']:
            return cls.get_random_car(cars=level_recod['cars'], weapons=level_recod['weapons'],
                                      tuner_items=level_recod['tuner_items'], car_params=car_params)
        else:
            log.warning('RandomizeCarExample: not found cache for level: %s. Try prev level.', level)
            return cls.get_random_car_level(level=level-1, car_params=car_params)


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
    with T("RandomizeCarExample"):
        RandomizeExamples.get_random_car(
            cars=[
                "reg:///registry/mobiles/cars/middle/offroad/ford_f_150",
                "reg:///registry/mobiles/cars/middle/offroad/ford_econoline",
                "reg:///registry/mobiles/cars/middle/cars/04_bmw_320i_e21",
                "reg:///registry/mobiles/cars/cargo/buses/04_gmc_pd_4501_scenicruiser",
            ],
            weapons=[
                "reg:///registry/items/slot_item/armorer_item/weapons/machine_guns/light/00_oc_14",
                "reg:///registry/items/slot_item/armorer_item/weapons/machine_guns/light/00_rpk",
                "reg:///registry/items/slot_item/armorer_item/weapons/machine_guns/medium/00_fg_42",
                "reg:///registry/items/slot_item/armorer_item/weapons/machine_guns/light/04_mt",
                "reg:///registry/items/slot_item/armorer_item/weapons/cannons/medium/01_bofors_m_45",
                "reg:///registry/items/slot_item/armorer_item/weapons/cannons/light/02_rg_6",
                "reg:///registry/items/slot_item/armorer_item/weapons/cannons/medium/02_mauser_mg_213",
            ],
        )

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
