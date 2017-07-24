#!/usr/bin/env python
# -*- coding: utf-8 -*-
from __future__ import absolute_import, print_function
import sys, os
import logging
log = logging.getLogger(__name__)

from sublayers_common.service_tools import run

from sublayers_common.ctx_timer import Timer
from sublayers_server.model.registry_me import classes  # Не удалять этот импорт! Авторегистрация классов.
from sublayers_server.model.registry_me.tree import Registry, get_global_registry
from cli._common import save_to_file
from cli.root import root

import click
from hgapi import HgException


@root.group(name='update', invoke_without_command=True)
@click.pass_context
def update(ctx):
    """Update version"""
    main_repo = ctx.obj['main_repo']
    world_repo = ctx.obj['world_repo']

    try:
        main_repo.hg_pull()
        world_repo.hg_pull()
    except HgException as e:
        log.error(e)
        return ctx.exit(e.exit_code)

    def upd(title, repo):
        old_id = repo.hg_id()
        upd_res = repo.hg_command('update')
        new_id = repo.hg_id()
        is_updated = old_id != new_id
        log.info(u'{:8} repo: {} UPDATED: {}'.format(title, 'IS    ' if is_updated else 'IS NOT', upd_res.strip()))
        return is_updated

    is_updated_main = upd('Main', main_repo)
    is_updated_world = upd('World', world_repo)

    if is_updated_world:
        log.info('Need to registry reload!')

    if is_updated_main or is_updated_world:
        log.info('Need to restart!')

    if ctx.invoked_subcommand:
        return



# @update.command()
# def check():
#     click.echo('TODO: Checking updates')
