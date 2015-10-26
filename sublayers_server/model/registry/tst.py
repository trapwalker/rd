# -*- coding: utf-8 -*-
import sys
import logging
log = logging.getLogger(__name__)

if __name__ == '__main__':
    log = logging.getLogger()
    sys.path.append('../../..')
    log.level = logging.DEBUG
    log.addHandler(logging.StreamHandler(sys.stderr))

from sublayers_server.model.registry import classes  # Не удалять этот импорт! Авторегистрация классов.
from sublayers_server.model.registry import storage
from sublayers_server.model.registry.uri import URI


if __name__ == '__main__':
    sys.path.append('../../..')
    from itertools import chain
    import random
    from sublayers_server.model.vectors import Point
    from pprint import pprint as pp
    import yaml

    reg = storage.Registry(name='registry', path=r'D:\Home\svp\projects\sublayers\sublayers_server\world\registry')
    # c = storage.Collection(name='cars', path=r"D:\Home\svp\projects\sublayers\sublayers_server\temp\user_data.db")
    # sedan = reg['/mobiles/cars/sedan']
    #
    # mj0 = sedan.instantiate(storage=c)
    # mj0.slot_CC = None
    # mj0.slot_FC.ammo_per_second = 10
    #
    # print 'mj0.__getstate__()->'
    # pp(mj0.__getstate__())
    # car_id = mj0.name
    #
    # mj0.save()
    #
    # print
    # print 'mj0 dump:'
    # s = yaml.dump(mj0, default_flow_style=False, allow_unicode=True)
    # print s
    #
    # mj1 = yaml.load(s)
    # print 'mj1.__getstate__()->'
    # pp(mj1.__getstate__())
    #
    # c.close()
    # cc = storage.Collection(name='cars', path=r"D:\Home\svp\projects\sublayers\sublayers_server\temp\user_data.db")
    # mj3 = cc['/' + car_id]
    # print 'mj3.__getstate__()->'
    # pp(mj3.__getstate__())

    #a = storage.Collection(name='agents', path=r"D:\Home\svp\projects\sublayers\sublayers_server\temp\user_data.db")
    #proto_agent = reg['/agents/user']
    #protocar = reg['/mobiles/cars/sedan']
    #user = proto_agent.instantiate(storage=a)
    #pp(user.resume_dict())
    ##print user.resume().decode('utf-8')
    #car = protocar.instantiate()
    #user.car = car
    #print car.resume().decode('utf-8')
    ##it = reg[car.inventory[0]]
    ##it.as_client_dict()
    #rt = reg['/poi/radio_towers/radio_tower1']

    #print [item.position for item in car.inventory]
    #ua = URI('reg://registry/agents')
    #print ua.match(user.parent)

    #tr = reg['/institutions/trader/buhman']
    #pp(tr.as_client_dict(items=car.inventory))

    q = reg['/quests/killer/n_kills']
    print q
