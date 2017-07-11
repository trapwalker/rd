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
from sublayers_common.ctx_timer import Timer, T
from sublayers_server.model.registry_me.tree import (
    connect,
    Node, get_global_registry, ListField, EmbeddedNodeField, Registry, RegistryLinkField, StringField,
    GenericEmbeddedDocumentField,
    DynamicSubdoc,
    STAT,
    field_getter_decorator,
)

from pprint import pprint as pp


class A(Node):
    s = StringField()
    g = GenericEmbeddedDocumentField(default=lambda: DynamicSubdoc(), not_inherited=True, reinst=True)

class B(Node):
    it = EmbeddedNodeField(document_type=A)
    items = ListField(field=EmbeddedNodeField(document_type=A))
    links = ListField(field=RegistryLinkField(document_type=A))

class AA(A):
    x = StringField()


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

    def ag(num):
        a = Agent.objects.filter(user_id='user_{}'.format(num)).first()
        if a is None:
            a = Agent(
                login='test_login_{}'.format(num),
                user_id='user__{}'.format(num),
                profile=
                    #reg.get('/registry/agents/user').instantiate(
                    dict(parent='/registry/agents/user',
                    name='test_profile_{}'.format(num),
                    #role_class='/registry/rpg_settings/role_class/chosen_one',  # todo: Убрать как наследуемый?
                ),
            ).save()
            log.debug('Agent {} created'.format(num))
        else:
            log.debug('Agent {} loaded'.format(num))
        return a

    a = ag(1)
    #b = ag(2)
    t = reg.get('reg:///registry/poi/locations/towns/prior')
    with Timer() as t0:
        for b in t.buildings:
            with Timer() as t1:
                x = b.as_client_dict()
                print(u'[{t1.duration:.3f}s] - {b.title}'.format(**locals()))
    print('TOTAL:', t0.duration)

    #T = lambda name: Timer(name=name, log_start=None, logger=log)
    #T = T()
    tr = t.buildings[0].head

    with T('Trader refresh'):
        tr.on_refresh(None)

    with T('Get assort TOTAL'):
        for i in xrange(10):
            with T('Get assort #{}'.format(i)):
                tr.get_trader_assortment(a)

    m = reg.get('/registry/institutions/mayor/whitehill_manny_askorti')
    q = m.quests[-2]
    #q = reg.get('/registry/quests/search_courier')
    with T('quest inst'):
        qq = q.instantiate()


    globals().update(locals())

def test4(reload=True, save_loaded=True):
    import sublayers_server.model.registry_me.classes
    #from sublayers_server.model.registry_me.classes.agents import Agent
    reg = get_global_registry(path=u'../../../tmp', reload=reload, save_loaded=save_loaded)
    #ag = Agent.objects.filter({}).first()

    #reg = get_global_registry(path=u'../../../sublayers_world', reload=reload, save_loaded=save_loaded)
    # c = reg.get('reg:///registry/mobiles/cars/light/motorcycles/honda_hornet')
    # cc = c.instantiate()
    # w = reg.get('reg:///registry/items/slot_item/armorer_item/weapons/machine_guns/dshkm_twin')
    # ww = w.instantiate()
    # cc.slot_FC = ww
    a = reg.get('/registry/a')
    b = reg.get('/registry/b')

    globals().update(locals())

if __name__ == '__main__':
    import math
    db_name = 'rd' + 't'
    db = connect(db=db_name)
    log.info('Use {db_name!r} db'.format(**locals()))

    
    rel = 0
    test3(reload=rel, save_loaded=True)
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
