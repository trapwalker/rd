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

from sublayers_server.model.registry_me.classes.agents import Agent
from sublayers_server.model.registry_me import classes
from sublayers_common.ctx_timer import Timer, T
from sublayers_server.model.registry_me.tree import (
    GRLPC,
    RegistryNodeIsNotFound,
    connect,
    Node, get_global_registry, ListField, EmbeddedNodeField, Registry, RegistryLinkField, StringField,
    GenericEmbeddedDocumentField,
    DynamicSubdoc,
    STAT,
    field_getter_decorator,
)

from pprint import pprint as pp
import os


def test1(reload, save_loaded):
    reg = get_global_registry(path=u'../../../sublayers_world', reload=reload, save_loaded=save_loaded)
    agents = Agent.objects.limit(50)
    repeat = True
    a, i = None, 0
    di = {}
    dn = {}
    while repeat:
        a = None

        try:
            with GRLPC as problems:
                a = agents.next()
            print('{:5}: '.format(i), end='')
            print('{:32} {}'.format(a.login, problems))

            di[i] = a
            dn[a.login] = a

            if problems:
                a._created = True
                with T('We have %d problems. SAVE' % problems):
                    a.save()

        except StopIteration:
            repeat = False
        except RegistryNodeIsNotFound as e:
            print('{:5}: '.format(i), end='')
            print(e)
        finally:
            i += 1

    globals().update(locals())


if __name__ == '__main__':
    import math
    db_name = 'rd' #+ 't'
    db = connect(db=db_name)
    log.info('Use {db_name!r} db'.format(**locals()))

    rel = 0

    with T('=== Test DONE ==='):
        test1(reload=rel, save_loaded=True)
