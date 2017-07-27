# -*- coding: utf-8 -*-
from __future__ import absolute_import, print_function
import sys, os
import logging
log = logging.getLogger(__name__)

from mongoengine import connect
import click
from hgapi import Repo

context_settings = dict(
    default_map={
        'db': 'rd',
        'verbose': True,
        # 'reload': dict(),
    },
)

@click.group()
@click.option('--db', default='test_database', show_default=True, help='Database name')
@click.option('--verbose/--no-verbose', is_flag=True, default=False, help='Verbose logging')
@click.option('--project', '-p', default=None, type=click.Path(file_okay=False, dir_okay=True, writable=True, exists=True))
@click.option('--world', '-w', default=None, type=click.Path(file_okay=False, dir_okay=True, writable=True, exists=True))

#@click.option('--fixtures', '-x', is_flag=True, default=False, help='Fixtures reload')
#@click.option('--reset', '-r', is_flag=True, default=False, help='Reset game data')
@click.pass_context
def root(ctx, db, verbose, project, world):
    if not verbose:
        log.setLevel('INFO')

    if not world:
        world = os.path.join(project, u'sublayers_world')

    main_repo = Repo(project)
    world_repo = Repo(world)

    ctx.obj.update(
        db=db,
        verbose=verbose,
        project=project,
        world=world,
        main_repo=main_repo,
        world_repo=world_repo,
    )
    db = connect(db=db)
    log.debug('Use project root: %r', ctx.obj['project'])
