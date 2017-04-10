# -*- coding: utf-8 -*-
from __future__ import absolute_import, print_function
import sys
import logging
log = logging.getLogger(__name__)

if __name__ == '__main__':
    log = logging.getLogger()
    sys.path.append('../../..')
    log.level = logging.DEBUG
    log.addHandler(logging.StreamHandler(sys.stderr))

from sublayers_server.model.registry_me import classes  # Не удалять этот импорт! Авторегистрация классов.
from sublayers_server.model.registry_me.tree import Node, get_global_registry

from pprint import pprint as pp
from mongoengine import connect


def test3():
    import sublayers_server.model.registry_me.classes
    reg = get_global_registry(path=u'../../../sublayers_world/registry', reload=True)
    x = reg.get('/registry/items/usable/tanks/tank_full/tank_10l')
    print(x.parent)
    globals().update(locals())


if __name__ == '__main__':
    db = connect(db='test_me')
    log.info('Use `test_me` db')
    test3()