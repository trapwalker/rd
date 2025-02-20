#!/usr/bin/env python
# -*- coding: utf-8 -*-
from __future__ import absolute_import, print_function
import sys, os
import logging
log = logging.getLogger(__name__)

from sublayers_common.service_tools import run

from ctx_timer import Timer
from sublayers_server.model.registry_me import classes  # Не удалять этот импорт! Авторегистрация классов.
from sublayers_server.model.registry_me.tree import Registry, get_global_registry
from cli._common import save_to_file
from cli.root import root
from cli.reg import reg_reload
from cli.control import stop, start, save

import click
from hgapi import HgException


@root.group(name='update', invoke_without_command=True)
@click.option('--export' ,'-x', 'dest', type=click.File(mode='w'), help='Export registry tree to the file')
@click.option('--no_db', is_flag=True, default=False, help='Do not store registry to DB')
@click.option('--clean_agents', '-C', is_flag=True, default=False, help='Clean all stored agents from DB')
@click.option('--reset_profiles', '-R', is_flag=True, default=False, help='Reset profile registration state to "nickname"')
@click.option('--host' ,'-h', 'host', default='http://localhost:8000', type=click.STRING, help='Host to send the command')
@click.option('--no_reload', is_flag=True, default=False, help='Do not reload registry')
@click.option('--no_restart', is_flag=True, default=False, help='Do not restart services')
@click.option('--no_pull', is_flag=True, default=False, help='Do not pull before update')
@click.pass_context
def update(ctx, dest, no_db, clean_agents, reset_profiles, host, no_reload, no_restart, no_pull):
    """Update version"""
    main_repo = ctx.obj['main_repo']
    world_repo = ctx.obj['world_repo']
    world = ctx.obj['world']

    if not no_pull:
        try:
            main_repo.hg_pull()
            world_repo.hg_pull()
        except HgException as e:
            log.error(e)
            return ctx.exit(e.exit_code)
    else:
        log.debug('Pull disabled')

    def upd(title, repo):
        old_id = repo.hg_id()
        br = repo.hg_command('branch').strip()
        upd_res = repo.hg_command('update', br)
        new_id = repo.hg_id()
        is_updated = old_id != new_id
        log.info(u'{:8} repo: {} UPDATED({}): {}'.format(title, 'IS    ' if is_updated else 'IS NOT', br, upd_res.strip()))
        return is_updated

    is_updated_main = upd('Main', main_repo)
    is_updated_world = upd('World', world_repo)

    if is_updated_main or is_updated_world:
        if is_updated_world:
            log.info('World updated')

        if is_updated_main:
            log.info('Source updated')

        if not no_restart:
            # todo: save and backup before stop (optionaly)
            stop(host=host)  # todo: configure server host
        if not no_reload:
            reg_reload(world=world, dest=dest, no_db=no_db, clean_agents=clean_agents, reset_profiles=reset_profiles)
        if not no_restart:
            start()
        # todo: Сохранять версии реестров в файле на момент запуска, чтобы понимать требуется ли перезагрузка

    if ctx.invoked_subcommand:
        return



# @update.command()
# def check():
#     click.echo('TODO: Checking updates')
