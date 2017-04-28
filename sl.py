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


CONTEXT_SETTINGS = dict(
    default_map={'db': 'test_me'},
)


@click.group(context_settings=CONTEXT_SETTINGS)
@click.option('--db', help='Database name')
#@click.option('--fixtures', '-x', is_flag=True, default=False, help='Fixtures reload')
#@click.option('--reset', '-r', is_flag=True, default=False, help='Reset game data')
@click.pass_context
def cli(ctx, db):
    ctx.obj['db'] = db
    db = connect(db='db')


@cli.group(name='reg')
@click.pass_context
def reg(ctx):
    """Operations with game registry"""
    pass


@reg.command(name='clean')
@click.pass_context
def reg_clean(ctx):
    """Full cleaning of game registry from DB"""
    click.echo('Full registry cleaning...')
    count = Registry.objects.delete()
    click.echo('Clean registry: %s' % count)


@reg.command(name='reload')
@click.option('--export', '-x', default=None, help='Export registry tree to the file')
@click.pass_context
def reg_reload(ctx, export):
    """Clean registry DB, load them from FS and save to DB"""
    click.echo('Cleaning of fixtures...')
    count = Registry.objects.delete()
    click.echo('Deleted fixture objects: %s' % count)

    click.echo('Loading registry fixtures to DB...')
    r = get_global_registry(path=os.path.join(project_root, u'sublayers_world', u'registry'), reload=True)
    click.echo('Loading registry fixtures DONE')  # todo: show timing and counts

    if export:
        reg_export(r, export)


def reg_export(registry, fn):
        try:
            with open(fn, 'w') as f:
                js = registry.to_json(indent=4, ensure_ascii=False)
                f.write(js.encode('utf-8'))
        except IOError as f:
            click.echo("Can't use file {!r} to write json data".format(fn) , err=True)


if __name__ == '__main__':
    cli(sys.argv[1:], obj={})
