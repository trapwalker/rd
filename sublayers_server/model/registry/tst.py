﻿# -*- coding: utf-8 -*-
import sys
import logging
log = logging.getLogger(__name__)

if __name__ == '__main__':
    log.level = logging.DEBUG
    log.addHandler(logging.StreamHandler(sys.stderr))

from sublayers_server.model.registry import classes
from sublayers_server.model.registry.tree import Registry, Collection, Dispatcher


if __name__ == '__main__':
    storages = Dispatcher()

    reg = Registry(dispatcher=storages, name='registry', path=r'D:\Home\svp\projects\sublayers\sublayers_server\world\registry')
    c = Collection(dispatcher=storages, name='cars', path=r"D:\Home\svp\projects\sublayers\sublayers_server\temp\user_data.db")

    jeep = reg['/mobiles/cars/jeep']
    my_jeep = jeep.instantiate(storage=c)

    print jeep.uri
    print jeep.slot_CC
    print my_jeep
    print my_jeep.uri
    #print reg[my_jeep.uri]


