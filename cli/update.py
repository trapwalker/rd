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


@root.group(name='update', invoke_without_command=True)
@click.pass_context
def update(ctx):
    """Update version"""

    if ctx.invoked_subcommand:
        return



# @update.command()
# def check():
#     click.echo('TODO: Checking updates')
