# -*- coding: utf-8 -*-
from __future__ import absolute_import, print_function
import sys, os
import logging
log = logging.getLogger(__name__)

from mongoengine import connect
import click

context_settings = dict(
    default_map={
        'db': 'rd',
        'verbose': True,
        # 'reload': dict(),
    },
)

@click.group(context_settings=context_settings)
@click.option('--db', default='test_database', help='Database name')
@click.option('--verbose/--no-verbose', is_flag=True, default=False, help='Verbose logging')
#@click.option('--fixtures', '-x', is_flag=True, default=False, help='Fixtures reload')
#@click.option('--reset', '-r', is_flag=True, default=False, help='Reset game data')
@click.pass_context
def root(ctx, db, verbose):
    if not verbose:
        log.setLevel('INFO')

    ctx.obj.update(
        db=db,
        verbose=verbose,
    )
    db = connect(db=db)
    log.debug('Use project root: %r', ctx.obj['project_root'])
