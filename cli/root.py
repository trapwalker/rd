# -*- coding: utf-8 -*-
import sys
import os
import logging
log = logging.getLogger(__name__)

from mongoengine import connect
import click


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
        logging.getLogger().setLevel('INFO')

    if not world:
        world = os.path.join(project, 'sublayers_world')

    # Git repo support (removed hgapi dependency)
    # main_repo and world_repo can be added later if needed via gitpython

    ctx.obj.update(
        db=db,
        verbose=verbose,
        project=project,
        world=world,
    )
    db = connect(db=db)
    log.info('Use project root: %r', ctx.obj['project'])
