# -*- coding: utf-8 -*-
import sys
import logging
log = logging.getLogger(__name__)

if __name__ == '__main__':
    log.level = logging.DEBUG
    log.addHandler(logging.StreamHandler(sys.stderr))

from sublayers_server.model.registry import classes
from sublayers_server.model.registry.tree import Registry, Collection, Dispatcher


if __name__ == '__main__':
    reg = Registry(name='registry', path=r'D:\Home\svp\projects\sublayers\sublayers_server\world\registry')
    c = Collection(r"D:\Home\svp\projects\sublayers\sublayers_server\temp\user_data.db")

    storages = Dispatcher([reg, c])

    jeep = reg['/mobiles/cars/jeep']
    #my_jeep = jeep.in

    print jeep.uri
    print jeep.slot_CC


