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
    """Operations with agents database"""
    pass


@agents.command(name='clean')
@click.pass_context
def agents_clean(ctx):
    """Full cleaning agents"""
    click.echo('Cleaning all agents...')
    _agents_clean()


DEFAULT_FN_TEMPLATE = '{agent.login}.yaml'
DEFAULT_CLEAN_WILDCARD = '*.yaml'

@agents.command(name='export')
@click.argument('dest', type=click.Path(file_okay=False, writable=True))
@click.option('--fn-format', '-f', 'fn_format',default=DEFAULT_FN_TEMPLATE, help='Template to make filenames (%r by default)' % DEFAULT_FN_TEMPLATE)
@click.option('--clean-wildcard', '-c', 'clean_wildcard', default=DEFAULT_CLEAN_WILDCARD, help='Wildcard to remove files from destination dir (%r by default)' % DEFAULT_CLEAN_WILDCARD)
@click.option('--no-clean', '-C', 'no_clean', is_flag=True, default=False, help='Do not clean dest directory by wildcard')
@click.pass_context
def agents_export(ctx, dest, fn_format, clean_wildcard, no_clean):
    """Export all agents to separate files"""
    import glob

    click.echo('Export agents to {dest}...'.format(**locals()))
    if os.path.isfile(dest):
        log.error('File %s already exists', dest)
        return 1

    if os.path.isdir(dest):
        log.info('Path %s already exists', dest)
        if not no_clean:
            cleaning_mask = os.path.join(dest, clean_wildcard)
            log.warning('Will remove %s', cleaning_mask)
            for fn in glob.glob(cleaning_mask):
                try:
                    os.remove(fn)
                except WindowsError as e:
                    log.error("Can't remove file %s: %s", fn, e)
                else:
                    log.debug("File %s deleted successfully", fn)
    else:
        try:
            os.makedirs(dest)
        except WindowsError as e:
            log.error("Can't create destination path %s: %s", dest, e)
            return 1
        else:
            log.info('Destination path %s created successfully', dest)

    i = -1
    count_ok = 0
    count_err = 0
    with Timer() as tm:
        for i, agent in enumerate(Agent.objects.all()):
            try:
                fn = fn_format.format(agent=agent, num=i, **ctx.obj)
                # todo: make more info to formatting context
            except Exception as e:
                count_err += 1
                log.error('Error in template (%r) to build filename by agent %r: %s', fn_format, agent, e)
                continue

            full_path = os.path.join(dest, fn)
            file_dir, file_name = os.path.split(full_path)
            if not os.path.isdir(file_dir):
                try:
                    os.makedirs(file_dir)
                except Exception as e:
                    count_err += 1
                    log.error('An error occurred while creating path %r: %s', file_dir, e)
                    continue

            try:
                with Timer() as tm1:
                    agent.save_to_file(full_path)
            except Exception as e:
                count_err += 1
                log.error('An error occurred while saving an object %r to %s: %s', agent, fn_format, e)
                continue
            else:
                count_ok += 1
                log.info('Agent %s to %r saved DONE (%.2fs)', agent, full_path, tm1.duration)

    log.info('%d agents exporting DONE, %d erros (%.2fs)', count_ok, count_err, tm.duration)


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
