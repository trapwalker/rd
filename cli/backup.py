#!/usr/bin/env python
# -*- coding: utf-8 -*-
from __future__ import absolute_import, print_function
import sys, os
import logging
log = logging.getLogger(__name__)


from cli.root import root
from cli.control import save
from sublayers_common.service_tools import run

import click
import subprocess
import datetime
import zipfile
import shutil


@root.group(name='backup', invoke_without_command=True)
@click.option('--dest', '-d', 'dest', default=None, type=click.Path(file_okay=False, writable=True))
@click.option('--save' ,'-s', 'save_server', is_flag=True, default=False, help='Backup server database')
@click.option('--host' ,'-h', 'host', default='https://roaddogs.ru', type=click.STRING, help='Host to send the command')
@click.pass_context
def backup_command(ctx, dest, save_server, host):
    """Start service"""

    if ctx.invoked_subcommand:
        return

    db = ctx.obj['db']
    backup(db, dest, save_server, host)


def backup(db, dest, save_server, host):
    if save_server:
        save(host=host)  # todo: configure server host

    dt = datetime.datetime.now().strftime('%Y-%m-%d_%H%M%S')
    fn = '{dt}'.format(**locals())
    zf = '{fn}.zip'.format(**locals())
    log.info('Backup db of {host}'.format(**locals()))
    try:
        log.debug(run('mongodump -d {db} -o {fn}'.format(**locals()).split()))
    except subprocess.CalledProcessError as e:
        log.error(e)
    else:
        try:
            with zipfile.ZipFile(zf, 'w') as z:
                for root, dirs, files in os.walk(fn):
                    for file in files:
                        z.write(os.path.join(root, file))
        finally:
            pass
    finally:
        shutil.rmtree(fn, ignore_errors=True)
