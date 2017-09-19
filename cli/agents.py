#!/usr/bin/env python
# -*- coding: utf-8 -*-
from __future__ import absolute_import, print_function
import sys, os
import logging
log = logging.getLogger(__name__)


from sublayers_server.model.registry_me import classes  # Не удалять этот импорт! Авторегистрация классов.
from sublayers_server.model.registry_me.tree import get_global_registry
from sublayers_server.model.registry_me.classes.agents import Agent
from cli.agents_adm import Select

from mongoengine import connect
import click
from ctx_timer import Timer

from cli.root import root


@root.group(name='agents')
@click.pass_context
def agents(ctx):
    """Operations with agents database"""
    pass


@agents.group(name='find', invoke_without_command=True)
@click.pass_context

@click.option('--fixup', '-x', 'fixup', is_flag=True, default=False, help='Fixup problems')
@click.option('--wipe_unsolved', '-w', 'wipe_unsolved', is_flag=True, default=False, help='Delete agents with unsolved problems')
@click.option('--reg_reload', '-r', 'reg_reload', is_flag=True, default=False, help='Reload registry from filesystem')
@click.option('--skip', '-s', 'skip', default=None, type=click.INT, help='Count records to skip')
@click.option('--limit', '-l', 'limit', default=None, type=click.INT, help='Count records to limit')
@click.option('--filter', '-f', 'fltr', default=None, type=click.STRING, help='Filter agents')

@click.option('--format', '-m', 'fmt', default='{i:5}: {it.login}', type=click.STRING, help='Item echo format')

def agents_find(ctx, fixup, wipe_unsolved, reg_reload, skip, limit, fltr, fmt):
    world = ctx.obj['world']

    if ctx.invoked_subcommand is None:
        sel = Select(
            cls=Agent, world_path=world, reg_reload=reg_reload,
            skip=skip, limit=limit, fltr=fltr, fixup=fixup, wipe_unsolved=wipe_unsolved,
            #raw_only=True,
        )
        for i, raw, it in sel:
            click.echo(fmt.format(**locals()))


@agents.command(name='clean')
@click.pass_context
def agents_clean(ctx):
    """Full cleaning agents"""
    from cli._common import agents_clean
    click.echo('Cleaning all agents...')
    agents_clean()


@agents.command(name='check')
@click.option('--fixup', '-x', 'fixup', is_flag=True, default=False, help='Fixup problems')
@click.option('--wipe_unsolved', '-w', 'wipe_unsolved', is_flag=True, default=False, help='Delete agents with unsolved problems')
@click.option('--reg_reload', '-r', 'reg_reload', is_flag=True, default=False, help='Reload registry from filesystem')
@click.option('--skip', '-s', 'skip', default=None, type=click.INT, help='Count records to skip')
@click.option('--limit', '-l', 'limit', default=None, type=click.INT, help='Count records to limit')
@click.option('--details', '-d', 'details', is_flag=True, default=False, help='Fixup problems')
@click.pass_context
def agents_check(ctx, fixup, wipe_unsolved, reg_reload, skip, limit, details):
    from sublayers_server.model.registry_me.tree import GRLPC, RegistryNodeIsNotFound
    from collections import Counter

    world = ctx.obj['world']

    counter = Counter()
    reg = get_global_registry(path=world, reload=reg_reload, save_loaded=fixup)
    counter['1. TOTAL'] = Agent.objects.count()
    agents = Agent.objects.as_pymongo()
    if skip:
        agents = agents.skip(skip)

    if limit:
        agents = agents.limit(limit)

    i = skip or 0
    while True:
        try:
            a_raw = agents.next()
            counter['2. Processed'] += 1
        except StopIteration:
            break

        qf = a_raw.get('quick_flag')
        flags = {True: 'Q', False: 'B', None: '-'}.get(qf, '?==={!r}==='.format(qf))
        login = a_raw.get('login', '--- UNDEFINED --- ' + str(a_raw.get('_id')))

        a, problems, e = None, None, None
        t_save = None
        fixed = False
        deleted_count = 0
        wipe_try = False

        try:
            with GRLPC as problems:
                a = Agent._from_son(a_raw)
                counter['3. Loaded'] += 1

            if problems:
                counter['4. Need to FIX'] += 1
                if fixup:
                    a._created = True
                    with Timer() as t_save:
                        a.save()
                        fixed = True
                        counter['5. FIXED'] += 1

        except RegistryNodeIsNotFound as e:
            counter['6. Need to delete'] += 1
            if wipe_unsolved:
                wipe_try = True
                deleted_count = Agent.objects.filter(pk=a_raw['_id']).delete()
                counter['7. Delete try'] += 1
                counter['8. Deleted'] += deleted_count

        if e:
            wipe_res = '{deleted_count:3}'.format(**locals()) if wipe_try else '---'
            res = 'WIPE: {wipe_res}: {e}'.format(**locals())
        else:
            if problems:
                problems_count = int(problems) if problems is not None else '--'
                res = 'FIX {problems_count:2} {fix_text}'.format(fix_text='DONE' if fixed else 'need', **locals())
            else:
                res = ''

        if details:
            click.echo('{i:5}: [{flags}] {login:32} {res}'.format(**locals()))

        i += 1

    click.echo('\n== STAT ====================')
    k_max = max(map(len, counter.keys()))
    for k, v in sorted(counter.items()):
        click.echo('{k:{k_max}}: {v:6}'.format(**locals()))


@agents.command(name='perks_reset')
@click.pass_context
def agents_perks_reset(ctx):
    """Full cleaning agent perks"""
    world = ctx.obj['world']
    try:
        registry = get_global_registry(path=world, reload=False, save_loaded=False)
    except Exception as e:
        log.error(e)
        return
    click.echo('Perks reset start')
    count = 0
    all_agents = Agent.objects.all()
    for a in all_agents:
        if a.profile.perks:
            a.profile.perks = []
            # todo: add balance for library transaction
            a.save()
            count += 1
    click.echo('Perks reseted for {} agents'.format(count))


DEFAULT_FN_TEMPLATE = '{agent.pk}.{agent.login}.yaml'
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

    world = ctx.obj['world']
    try:
        registry = get_global_registry(path=world, reload=False, save_loaded=False)
    except Exception as e:
        log.error(e)
        return

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
