# -*- coding: utf-8 -*-
import sys
import logging
log = logging.getLogger(__name__)

if __name__ == '__main__':
    log.level = logging.DEBUG
    log.addHandler(logging.StreamHandler(sys.stderr))

from sublayers_server.model.registry import classes  # Не удалять этот импорт! Авторегистрация классов.
from sublayers_server.model.registry.storage import Registry, Collection, Dispatcher
from sublayers_server.model.registry.storage import Dumper
from sublayers_server.model.vectors import Point


if __name__ == '__main__':
    from pprint import pprint as pp
    import yaml
    storages = Dispatcher()

    reg = Registry(dispatcher=storages, name='registry', path=r'D:\Home\svp\projects\sublayers\sublayers_server\world\registry')
    c = Collection(dispatcher=storages, name='cars', path=r"D:\Home\svp\projects\sublayers\sublayers_server\temp\user_data.db")

    jeep = reg['/mobiles/cars/jeep']
    my_jeep = jeep.instantiate(storage=c)
    #my_jeep = c['cars/7c90c7ca3d06447698e08d543fbcee53']

    print my_jeep, my_jeep.slot_CC
    print
    my_jeep.slot_CC = None
    my_jeep.slot_FC.ammo_per_second = 10
    my_jeep.save()

    print
    print 'my_jeep dump:'
    s = yaml.dump(my_jeep, default_flow_style=False, allow_unicode=True, Dumper=Dumper)
    print s

    print
    print 'Load:'
    mj2 = c._load(s)
    print mj2
    print 'cc=', mj2.slot_CC
    print 'fc=', mj2.slot_FC

    car_id = my_jeep.name

    c.close()
    cc = Collection(dispatcher=storages, name='cars', path=r"D:\Home\svp\projects\sublayers\sublayers_server\temp\user_data.db")
    mj3 = cc['/' + car_id]
    print mj3

