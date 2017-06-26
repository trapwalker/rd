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
    from sublayers_server.model.registry_me.classes.agents import Agent
    reg = get_global_registry(path=u'../../../sublayers_world', reload=reload, save_loaded=save_loaded)
    #x = reg.make_node_by_uri('/registry/items/usable/tanks/tank_full/tank_10l')
    #a = reg.get('/registry/mobiles/cars/heavy/btrs/m113a1/quick')
    #q = reg.get('/registry/agents/user/quick')

    # deleted_agents_count = Agent.objects.all().delete()
    # log.info('All stored agents deleted: %s', deleted_agents_count)

    t1 = reg.get('/registry/poi/locations/towns/paloma')
    t2 = reg.get('/registry/poi/locations/towns/prior')

    a = Agent.objects.filter(user_id='123456').first()
    if a is None:
        a = Agent(
            login='test_login',
            user_id='123456',
            profile=dict(
                parent='/registry/agents/user',
                name='123456',
                role_class='/registry/rpg_settings/role_class/chosen_one',  # todo: Убрать как наследуемый?
            ),
        ).save()
        log.debug('Agent created')
    else:
        log.debug('Agent loaded')

    log.debug('karma=%r', a.profile.karma)
    a.profile.karma = None
    log.debug('karma=%r', a.profile.karma)
    a.save()



    globals().update(locals())

def test4(reload=True, save_loaded=True):
    import sublayers_server.model.registry_me.classes
    #reg = get_global_registry(path=u'../../../tmp', reload=reload, save_loaded=save_loaded)
    reg = get_global_registry(path=u'../../../sublayers_world', reload=reload, save_loaded=save_loaded)
    t = reg.get('/registry/items/usable/tanks')
    tf = reg.get('/registry/items/usable/tanks/tank_full')
    t1 = reg.get('/registry/items/usable/tanks/tank_full/tank_10l')
    t2 = reg.get('/registry/items/usable/tanks/tank_full/tank_20l')
    q = reg.get('/registry/quests/delivery_quest/delivery_quest_simple')

    t.value_fuel = 3
    print(t.value_fuel)

    globals().update(locals())

if __name__ == '__main__':
    import math
    db_name = 'rd'
    db = connect(db=db_name)
    log.info('Use {db_name!r} db'.format(**locals()))

    
    rel = 1
    test4(reload=rel, save_loaded=True)
    #its = sorted([(v, k) for k, v in c.items()], reverse=True)

    print('DONE')
    if rel:
        print(STAT.s)
    #field_getter_decorator._debug = True

    # iterable save/load
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
