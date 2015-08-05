# -*- coding: utf-8 -*-
import sys
import logging
log = logging.getLogger(__name__)

if __name__ == '__main__':
    log.level = logging.DEBUG
    log.addHandler(logging.StreamHandler(sys.stderr))

from sublayers_server.model.registry import classes  # Не удалять этот импорт! Авторегистрация классов.
from sublayers_server.model.registry import storage


if __name__ == '__main__':
    from sublayers_server.model.vectors import Point
    from pprint import pprint as pp
    import yaml

    reg = storage.Registry(dispatcher=storage.Node.DISPATCHER, name='registry', path=r'D:\Home\svp\projects\sublayers\sublayers_server\world\registry')
    c = storage.Collection(dispatcher=storage.Node.DISPATCHER, name='cars', path=r"D:\Home\svp\projects\sublayers\sublayers_server\temp\user_data.db")

    jeep = reg['/mobiles/cars/jeep']

    mj0 = jeep.instantiate(storage=c)
    mj0.slot_CC = None
    mj0.slot_FC.ammo_per_second = 10

    #mj0 = c['cars/7c90c7ca3d06447698e08d543fbcee53']

    print 'mj0.__getstate__()->'
    pp(mj0.__getstate__())
    car_id = mj0.name

    mj0.save()

    print
    print 'mj0 dump:'
    s = yaml.dump(mj0, default_flow_style=False, allow_unicode=True)
    print s

    mj1 = yaml.load(s)
    print 'mj1.__getstate__()->'
    pp(mj1.__getstate__())


    # print
    # print 'Load:'
    # mj2 = c._load(s)
    # print mj2
    # print 'cc=', mj2.slot_CC
    # print 'fc=', mj2.slot_FC

    c.close()
    cc = storage.Collection(dispatcher=storage.Node.DISPATCHER, name='cars', path=r"D:\Home\svp\projects\sublayers\sublayers_server\temp\user_data.db")
    mj3 = cc['/' + car_id]
    print 'mj3.__getstate__()->'
    pp(mj3.__getstate__())

