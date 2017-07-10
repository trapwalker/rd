#!/usr/bin/env python
# -*- coding: utf-8 -*-
from __future__ import absolute_import, print_function
import sys, os
import logging
log = logging.getLogger(__name__)


from sublayers_common.ctx_timer import Timer
from sublayers_server.model.registry_me import classes  # Не удалять этот импорт! Авторегистрация классов.
from sublayers_server.model.registry_me.classes.agents import Agent

from mongoengine import connect
import click

from cli.root import root


@root.group(name='agents')
@click.pass_context
def agents(ctx):
    """Operations with agents database"""
    pass


@agents.command(name='clean')
@click.pass_context
def agents_clean(ctx):
    """Full cleaning agents"""
    from cli._common import agents_clean
    click.echo('Cleaning all agents...')
    agents_clean()


DEFAULT_FN_TEMPLATE = '{agent.login}.yaml'
DEFAULT_CLEAN_WILDCARD = '*.yaml'

@agents.command(name='export')
@click.argument('logins', nargs=-1)
@click.option('--dest', '-d', 'dest', default=None, type=click.Path(file_okay=False, writable=True))
@click.option('--fn-format', '-f', 'fn_format', default=DEFAULT_FN_TEMPLATE, show_default=True, help='Template to make filenames')
@click.option('--clean-wildcard', '-c', 'clean_wildcard', default=DEFAULT_CLEAN_WILDCARD, show_default=True, help='Wildcard to remove files from destination dir')
@click.option('--no-clean', '-C', 'no_clean', is_flag=True, default=False, help='Do not clean dest directory by wildcard')
@click.pass_context
def agents_export(ctx, logins, dest, fn_format, clean_wildcard, no_clean):
    """Export all agents to separate files"""
    import glob

    if dest:
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
        if logins:
            agents = Agent.objects.filter(login__in=logins)
        else:
            agents = Agent.objects.all()

        for i, agent in enumerate(agents):
            try:
                fn = fn_format.format(agent=agent, num=i, **ctx.obj)
                # todo: make more info to formatting context
            except Exception as e:
                count_err += 1
                log.error('Error in template (%r) to build filename by agent %r: %s', fn_format, agent, e)
                continue

            if dest:
                destination_to_save = os.path.join(dest, fn)
                file_dir, file_name = os.path.split(destination_to_save)
                if not os.path.isdir(file_dir):
                    try:
                        os.makedirs(file_dir)
                    except Exception as e:
                        count_err += 1
                        log.error('An error occurred while creating path %r: %s', file_dir, e)
                        continue
            else:
                destination_to_save = sys.stdout

            try:
                echo_out = sys.stdout if dest else destination_to_save
                click.echo('#' * 80, file=echo_out)
                click.echo(u'## {}'.format(agent), file=echo_out)
                with Timer() as tm1:
                    agent.save_to_file(destination_to_save)
            except Exception as e:
                count_err += 1
                log.error('An error occurred while saving an object %r to %s: %s', agent, fn_format, e)
                continue
            else:
                count_ok += 1
                log.info(
                    u'Saved to %s DONE (%.2fs): %s',
                    destination_to_save if dest else destination_to_save.name,
                    tm1.duration,
                    agent,
                )

    log.info('%d agents exporting DONE, %d erros (%.2fs)', count_ok, count_err, tm.duration)
