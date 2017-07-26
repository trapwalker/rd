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
import requests


def service_start(project_path, service_command, stdout_show_timeout=None):
    pass


@root.group(name='save', invoke_without_command=True)
@click.pass_context
def start_command(ctx):
    """Start service"""

    if ctx.invoked_subcommand:
        return

    save()


@root.group(name='start', invoke_without_command=True)
@click.pass_context
def start_command(ctx):
    """Start service"""

    if ctx.invoked_subcommand:
        return


@root.group(name='stop', invoke_without_command=True)
@click.pass_context
def stop_command(ctx):
    """Stop service"""

    if ctx.invoked_subcommand:
        return

    stop()


@root.group(name='restart', invoke_without_command=True)
@click.pass_context
def restart_command(ctx):
    """Restart service"""

    if ctx.invoked_subcommand:
        return


# @start.command(name='site')
# @click.pass_context
# def start_site(ctx):
#     pass
#
#
# @start.command(name='engine')
# @click.pass_context
# def start_engine(ctx):
#     pass
#
#
# @start.command(name='quick')
# @click.pass_context
# def start_engine(ctx):
#     pass


# @update.command()
# def check():
#     click.echo('TODO: Checking updates')


def stop():
    log.info(requests.post('http://localhost/adm/api/shutdown'))


def save():
    log.info(requests.post('http://localhost/adm/api/save'))
