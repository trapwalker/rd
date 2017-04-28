#!/usr/bin/env python
# -*- coding: utf-8 -*-
from __future__ import absolute_import, print_function
import sys, os
import logging
log = logging.getLogger(__name__)

if __name__ == '__main__':
    project_root = os.path.dirname(sys.argv[0])
    log = logging.getLogger()
    sys.path.append(project_root)
    log.level = logging.DEBUG
    log.addHandler(logging.StreamHandler(sys.stderr))

from sublayers_server.model.registry_me import classes  # Не удалять этот импорт! Авторегистрация классов.
from sublayers_server.model.registry_me.tree import Registry, get_global_registry

from mongoengine import connect
import click
import json
from pprint import pprint as pp


@click.command()
@click.option('--clean', '-c', is_flag=True, default=False, help='Full registry clean')
@click.option('--fixtures', '-x', is_flag=True, default=False, help='Fixtures reload')
@click.option('--reset', '-r', is_flag=True, default=False, help='Reset game data')
def cli(clean, fixtures, reset):
    db = connect(db='test_me')
    if clean or fixtures or reset:
        do(clean, fixtures, reset)
    else:
        click.echo('Nothing to do')


def do(clean, fixtures, reset):
    if clean:
        click.echo('Full registry cleaning...')
        count = Registry.objects.delete()
        click.echo('Clean registry: %s' % count)

    if fixtures:
        click.echo('Cleaning of fixtures...')
        count = Registry.objects.delete()
        click.echo('Deleted fixture objects: %s' % count)

        click.echo('Loading registry fixtures to DB...')
        reg = get_global_registry(path=os.path.join(project_root, u'sublayers_world', u'registry'), reload=True)
        click.echo('Loading registry fixtures DONE')  # todo: show timing and counts


        with open('registry.json', 'w') as f:
            #json.dump(reg.to_mongo(use_db_field=False), f, indent=2, ensure_ascii=False)
            js = reg.to_json(indent=4, ensure_ascii=False)
            f.write(js.encode('utf-8'))

    if reset:
        click.echo('Saved registry objects cleaning...')
        count = classes.agents.Agent.objects.filter({'fixtured': False}).delete()
        click.echo('Deleted objects: %s' % count)


if __name__ == '__main__':
    cli(sys.argv[1:])
