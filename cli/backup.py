#!/usr/bin/env python
# -*- coding: utf-8 -*-
from __future__ import absolute_import, print_function
import sys, os
import logging
log = logging.getLogger(__name__)


from cli.root import root
from cli.control import save, restart as do_restart
from sublayers_common.service_tools import run

import click
import subprocess
import datetime
import zipfile
import shutil


@root.group(name='backup', invoke_without_command=True)
@click.option('--dest', '-d', 'dest', default=None, type=click.Path(file_okay=False, writable=True))
@click.option('--save' ,'-s', 'save_server', is_flag=True, default=False, help='Backup server database')
@click.option('--host' ,'-h', 'host', default='http://localhost:8000', type=click.STRING, help='Host to send the command save')
@click.option('--restart', is_flag=True, default=False, help='Restart servers after backup')
@click.pass_context
def backup_command(ctx, dest, save_server, host, restart):
    """Start service"""

    if ctx.invoked_subcommand:
        return

    db = ctx.obj['db']
    backup(db, dest, save_server, host, restart)


def backup(db, dest, save_server, host, restart):
    dest = dest or '.'
    if save_server:
        save(host=host)  # todo: configure server host

    dt = datetime.datetime.now().strftime('%Y-%m-%d_%H%M%S')
    fn = '{dt}'.format(**locals())
    zf = '{fn}.zip'.format(**locals())
    log.info('Backup db of {host}'.format(**locals()))
    try:
        # TODO: Use temp folder
        log.debug(run('mongodump -d {db} -o {fn}'.format(**locals()).split()))
    except subprocess.CalledProcessError as e:
        log.error(e)
    else:
        with zipfile.ZipFile(os.path.join(dest, zf), 'w') as z:
            for root, dirs, files in os.walk(fn):
                for file in files:
                    z.write(os.path.join(root, file))

        if restart:
            do_restart(host=host)
    finally:
        shutil.rmtree(fn, ignore_errors=True)
