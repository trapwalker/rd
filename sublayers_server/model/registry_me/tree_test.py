# -*- coding: utf-8 -*-
from __future__ import absolute_import, print_function
import sys
import logging
log = logging.getLogger(__name__)

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

from sublayers_server.model.registry_me import classes  # Не удалять этот импорт! Авторегистрация классов.
from sublayers_common.ctx_timer import Timer
from sublayers_server.model.registry_me.tree import (
    connect,
    Node, get_global_registry, ListField, EmbeddedNodeField, Registry, RegistryLinkField, StringField,
    STAT,
    field_getter_decorator,
)

from pprint import pprint as pp


class A(Node):
    s = StringField()

class B(Node):
    it = EmbeddedNodeField(document_type=A)
    items = ListField(field=EmbeddedNodeField(document_type=A))
    links = ListField(field=RegistryLinkField(document_type=A))


def test3(reload=True, save_loaded=True):
    import sublayers_server.model.registry_me.classes
    reg = get_global_registry(path=u'../../../sublayers_world', reload=reload, save_loaded=save_loaded)
    #x = reg.make_node_by_uri('/registry/items/usable/tanks/tank_full/tank_10l')
    #a = reg.get('/registry/mobiles/cars/heavy/btrs/m113a1/quick')
    #q = reg.get('/registry/agents/user/quick')
    a = reg.get('reg:///registry/institutions/trader/paloma_shaun_fisher')
    b = reg.get('reg:///registry/institutions/trader/prior_hershey_la_palmas')
    c = reg.get('reg:///registry/institutions/trader/whitehill_bob_ferolito')

    def do(tr):
        with Timer() as tm:
            tr.on_refresh(None)
        log.debug('Trader {tr.name} refrash DONE ({tm.duration:.3f}s)'.format(**locals()))

    do(a)
    do(b)
    do(c)

    print(a.refresh_time)
    #x.expand_links()
    #x.respawn_objects

    globals().update(locals())

def test4(reload=True, save_loaded=True):
    import sublayers_server.model.registry_me.classes
    reg = get_global_registry(path=u'../../../tmp', reload=reload, save_loaded=save_loaded)
    # a = reg.get('/registry/a')
    # b = reg.get('/registry/b')
    # c = reg.get('/registry/b/c')

    globals().update(locals())

if __name__ == '__main__':
    import math
    db_name = 'rd'
    db = connect(db=db_name)
    log.info('Use {db_name!r} db'.format(**locals()))

    
    rel = 0
    test3(reload=rel, save_loaded=True)
    #its = sorted([(v, k) for k, v in c.items()], reverse=True)

    print('DONE')
    print(STAT.s)

    src = 'fs' if rel else 'db'

    r = reg
    n = 0
    for i in range(n):
        fn = 'reg_{}_{}.yaml'.format(src, str(i).zfill(int(math.ceil(math.log10(n)))))

        with Timer(name='save %s' % i, logger='stdout', log_start=None):
            r.save_to_file(fn)

        with Timer(name='load %s' % i, logger='stdout', log_start=None):
            r = Registry.load_from_file(fn)

    print('Ok')
