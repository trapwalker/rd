#!/usr/bin/env python
# -*- coding: utf-8 -*-
from __future__ import absolute_import, print_function
import sys, os
import logging
log = logging.getLogger(__name__)


def main(args=None):
    if args is None:
        args = sys.argv[1:]

    _base_path = __file__  # sys.argv[0]
    project_root = os.path.abspath(os.path.join(os.path.dirname(_base_path), '..'))
    sys.path.append(project_root)
    global log
    log = logging.getLogger()
    try:
        import coloredlogs
        coloredlogs.DEFAULT_FIELD_STYLES['levelname']['color'] = 'green'
        coloredlogs.install(level=logging.DEBUG, fmt='%(levelname)-8s| %(message)s')
    except ImportError:
        log.level = logging.DEBUG
        _hndl = logging.StreamHandler(sys.stderr)
        _hndl.setFormatter(logging.Formatter('%(levelname)-8s| %(message)s'))
        log.addHandler(_hndl)

    from cli.root import root
    from cli import (
        agents, reg,
        # update,
    )

    prog_path, prog_name = os.path.split(sys.argv[0])
    if prog_name == '__main__.py':
        prog_path, prog_name = os.path.split(prog_path)

    root(
        args,
        obj={},
        default_map={
            'db': 'rd',
            'verbose': True,
            'project': project_root,

            # 'reload': dict(),
        },
        prog_name=prog_name,
    )
