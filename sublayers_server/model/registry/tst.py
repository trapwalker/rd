# -*- coding: utf-8 -*-
import sys
import logging
log = logging.getLogger(__name__)

if __name__ == '__main__':
    log.level = logging.DEBUG
    log.addHandler(logging.StreamHandler(sys.stderr))

from sublayers_server.model.registry import classes  # Не удалять этот импорт! Авторегистрация классов.
from sublayers_server.model.registry.tree import Registry, Collection, Dispatcher
from sublayers_server.model.vectors import Point


if __name__ == '__main__':
    from pprint import pprint as pp
    storages = Dispatcher()

    reg = Registry(dispatcher=storages, name='registry', path=r'D:\Home\svp\projects\sublayers\sublayers_server\world\registry')
    c = Collection(dispatcher=storages, name='cars', path=r"D:\Home\svp\projects\sublayers\sublayers_server\temp\user_data.db")

    jeep = reg['/mobiles/cars/jeep']
    my_jeep = jeep.instantiate(storage=c)

    zis5 = reg['/items/slot_item/weapons/cannons/wc_zis5']
    my_zis5 = zis5.instantiate(storage=c)

    print jeep, jeep.slot_CC
    print my_jeep, my_jeep.slot_CC
    my_jeep.slot_BR = my_zis5

    print 'Slots of {}:'.format(my_jeep)
    for name, value in my_jeep.iter_slots():
        print name, value, value.parent if value else ''


