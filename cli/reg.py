#!/usr/bin/env python
# -*- coding: utf-8 -*-
from __future__ import absolute_import, print_function
import sys, os
import logging
log = logging.getLogger(__name__)


from sublayers_common.ctx_timer import Timer
from sublayers_server.model.registry_me import classes  # Не удалять этот импорт! Авторегистрация классов.
from sublayers_server.model.registry_me.tree import Registry, get_global_registry
from cli._common import save_to_file
from cli.root import root

import click


@root.group(name='reg')
@click.pass_context
def reg(ctx):
    """Operations with game registry"""


@reg.command(name='clean')
@click.pass_context
def reg_clean(ctx):
    """Full cleaning of game registry from DB"""
    click.echo('Full registry cleaning...')
    count = Registry.objects.delete()
    click.echo('Clean registry: %s' % count)


@reg.command(name='reload')
@click.option('--export' ,'-x', 'dest', type=click.File(mode='w'), help='Export registry tree to the file')
@click.option('--no_db', is_flag=True, default=False, help='Do not store registry to DB')
@click.option('--clean_agents', '-C', is_flag=True, default=False, help='Clean all stored agents from DB')
@click.option('--reset_profiles', '-R', is_flag=True, default=False, help='Reset profile registration state to "nickname"')
@click.pass_context
def reg_reload(ctx, dest, no_db, clean_agents, reset_profiles):
    """Clean registry DB, load them from FS and save to DB"""
    world = ctx.obj['world']
    try:
        registry = get_global_registry(path=world, reload=True, save_loaded=not no_db)
    except Exception as e:
        log.error(e)
        return

    if clean_agents:
        from cli._common import agents_clean
        agents_clean()

    if reset_profiles:
        from cli._common import profiles_reset
        profiles_reset()

    if dest:
        save_to_file(registry, dest)


@reg.command(name='export', help='Export registry from DB to the file')
@click.argument('dest', type=click.File(mode='w'))
@click.pass_context
def reg_export(ctx, dest):
    """Clean registry DB, load them from FS and save to DB"""
    world = ctx.obj['world']
    try:
        registry = get_global_registry(path=world, reload=False, save_loaded=False)
    except Exception as e:
        log.error(e)
        return

    save_to_file(registry, dest)
