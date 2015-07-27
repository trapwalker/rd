﻿# -*- coding: utf-8 -*-
import sys
import logging
log = logging.getLogger(__name__)

if __name__ == '__main__':
    log.level = logging.DEBUG
    log.addHandler(logging.StreamHandler(sys.stderr))

from sublayers_server.model.registry import classes
from sublayers_server.model.registry.tree import Registry, Collection


if __name__ == '__main__':
    reg = Registry(path=r'D:\Home\svp\projects\sublayers\sublayers_server\world\registry')
    jeep = reg['/mobiles/cars/jeep']
    #my_jeep = jeep.in

    c = Collection(r"D:\Home\svp\projects\sublayers\sublayers_server\temp\user_data.db")



    print jeep.uri



