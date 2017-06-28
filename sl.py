#!/usr/bin/env python
# -*- coding: utf-8 -*-
from __future__ import absolute_import, print_function
import sys, os
import logging
log = logging.getLogger(__name__)

if __name__ == '__main__':
    project_root = os.path.dirname(sys.argv[0])
    sys.path.append(project_root)
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

from sublayers_common.ctx_timer import Timer
from sublayers_server.model.registry_me import classes  # Не удалять этот импорт! Авторегистрация классов.
from sublayers_server.model.registry_me.classes.agents import Agent
from sublayers_server.model.registry_me.tree import Registry, get_global_registry

from mongoengine import connect
import click
import json
from pprint import pprint as pp


@click.group()
@click.option('--db', default='test_database', help='Database name')
@click.option('--verbose/--no-verbose', is_flag=True, default=False, help='Verbose logging')
#@click.option('--fixtures', '-x', is_flag=True, default=False, help='Fixtures reload')
#@click.option('--reset', '-r', is_flag=True, default=False, help='Reset game data')
@click.pass_context
def cli(ctx, db, verbose):
    if not verbose:
        log.setLevel('INFO')

    ctx.obj.update(
        db=db,
        verbose=verbose,
    )
    db = connect(db=db)


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
@click.option('--export' ,'-x', 'dest', type=click.File(mode='w'), help='Export registry tree to the file')
@click.option('--no_db', default=None, help='Do not store registry to DB (false by default)')
@click.option('--clean_agents', '-C', is_flag=True, default=False, help='Clean all stored agents from DB')
@click.pass_context
def reg_reload(ctx, dest, no_db, clean_agents):
    """Clean registry DB, load them from FS and save to DB"""
    try:
        registry = get_global_registry(path=os.path.join(project_root, u'sublayers_world'), reload=True, save_loaded=not no_db)
    except Exception as e:
        log.error(e)
        return

    if clean_agents:
        _agents_clean()

    if dest:
        _save_to_file(registry, dest)


@reg.command(name='export', help='Export registry from DB to the file')
@click.argument('dest', type=click.File(mode='w'))
@click.pass_context
def reg_export(ctx, dest):
    """Clean registry DB, load them from FS and save to DB"""
    try:
        registry = get_global_registry(path=os.path.join(project_root, u'sublayers_world'), reload=False, save_loaded=False)
    except Exception as e:
        log.error(e)
        return

    _save_to_file(registry, dest)


########################################################################################################################


@cli.group(name='agents')
@click.pass_context
def agents(ctx):
    """Operations with game registry"""
    pass


@agents.command(name='clean')
@click.pass_context
def agents_clean(ctx):
    """Full cleaning of game registry from DB"""
    click.echo('Cleaning all agents...')
    _agents_clean()


########################################################################################################################


def _agents_clean():
    with Timer() as tm:
        deleted_agents_count = Agent.objects.all().delete()
        log.info('All stored agents deleted: %s (%.3fs)', deleted_agents_count, tm.duration)


def _save_to_file(registry, dest):
    try:
        with Timer() as tmr:
            registry.save_to_file(dest)
            log.info('Registry saved to file {.name} ({:.3f}s)'.format(dest, tmr.duration))
    except Exception as e:
        log.error("Can't save registry to file {!r}: {}".format(dest, e))


if __name__ == '__main__':
    cli(
        sys.argv[1:],
        obj={},
        default_map={
            'db': 'rd',
            'verbose': True,
            #'reload': dict(),
        },
    )
