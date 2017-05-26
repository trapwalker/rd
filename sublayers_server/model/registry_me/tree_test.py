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
from sublayers_server.model.registry_me.tree import Node, get_global_registry, ListField, EmbeddedNodeField, Registry
from sublayers_common.ctx_timer import Timer

from pprint import pprint as pp
from mongoengine import connect


class A(Node):
    pass

class B(Node):
    it = EmbeddedNodeField(document_type=A)
    items = ListField(field=EmbeddedNodeField(document_type=A))


def test3(reload=True):
    import sublayers_server.model.registry_me.classes
    reg = get_global_registry(path=u'../../../sublayers_world', reload=reload)
    x = reg.make_node_by_uri('/registry/items/usable/tanks/tank_full/tank_10l')
    a = reg.get('/registry/mobiles/cars/heavy/btrs/m113a1/quick')
    globals().update(locals())

def test4():
    import sublayers_server.model.registry_me.classes
    reg = get_global_registry(path=u'../../../tmp', reload=True)
    a = reg.get('/registry/a')
    b = reg.get('/registry/b')
    c = B(it=dict(
        #_cls='A',
        parent='/registry/a',
        name='a___',
    ))
    c.expand_links()
    globals().update(locals())

if __name__ == '__main__':
    db = connect(db='test_me')
    log.info('Use `test_me` db')
    rel = 0
    test3(reload=rel)
    from sublayers_server.model.registry_me.tree import _expand_counter as c, _expand_legend as l
    its = sorted([(v, k) for k, v in c.items()], reverse=True)

    print('DONE')

    with open('reg_{}.json'.format('fs' if rel else 'db'), 'w') as f:
        f.write(reg.to_json(ensure_ascii=False, indent=2).encode('utf-8'))

    with Timer(logger='stdout') as t, open('reg_{}.json'.format('fs' if rel else 'db')) as f:
        r2 = Registry.from_json(f.read(), created=True)

    with open('reg_{}_f.json'.format('fs' if rel else 'db'), 'w') as f:
        f.write(r2.to_json(ensure_ascii=False, indent=2).encode('utf-8'))


    print('Ok')
