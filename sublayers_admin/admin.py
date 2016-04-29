#!/usr/bin/env python
# -*- coding: utf-8 -*-
from __future__ import absolute_import

import urlparse
import sys
import os


def parent_folder(fn):
    return os.path.abspath(os.path.join(os.path.dirname(fn), '..'))


PROJECT_PATH = os.path.abspath(os.path.dirname(__file__))

sys.path.append(parent_folder(__file__))

#import logging.config
#logging.config.fileConfig(os.path.join(PROJECT_PATH, "logging.conf"))
#log = logging.getLogger(__name__)

import cmd2
from pymongo import MongoClient
from tornado.options import options

from sublayers_server import settings
from sublayers_common.service_tools import HGRevision


def clean_collection(db, collection):
    db[collection].remove({}, multi=True)
    print 'Collection of "{}" cleaned. Now count is {}'.format(collection, db[collection].count())


def get_revision(pth):
    rev = None
    with os.popen('hg identify -R {}'.format(pth)) as f:
        rev = f.read().strip()
    if not rev:
        raise Exception("Can't check repository revision: {}".format(pth))
    return rev


def call(cmd):
    res = []
    print '>', cmd
    with os.popen(cmd) as f:
        for line in f:
            print line[:-1] if line.endswith('\n') else line
            res.append(line)
    return ''.join(res)


class AdmCmd(cmd2.Cmd):

    def __init__(self, db, **kw):
        cmd2.Cmd.__init__(self, **kw)
        self.db = db

    def do_stat(self, arg):
        print '{:20}: {:6}'.format('Agents count', self.db.agents.count())
        print '{:20}: {:6}'.format('Profiles count', self.db.profiles.count())
    
    def do_reset(self, arg=None):
        '''
            Reset server DB by collection name
        '''
        if not arg:
            arg = 'agents'

        args = arg.split()

        for collection in args:
            clean_collection(self.db, collection)

    def do_update(self, arg):
        r1p = os.path.join(PROJECT_PATH, '..')
        r2p = options.world_path if os.path.isabs(options.world_path) else os.path.join(PROJECT_PATH, options.world_path)
        r1 = HGRevision(r1p)
        r2 = HGRevision(r2p)
        call('hg pull -u -R {}'.format(r1p))
        call('hg pull -u -R {}'.format(r2p))
        r1_ = HGRevision(r1p)
        r2_ = HGRevision(r2p)
        if r1.hash != r1_.hash: print 'Server repo updated'
        if r2.hash != r2_.hash: print 'World repo updated'
        if (r1.hash != r1_.hash) or (r2.hash != r2_.hash):
            self.do_restart()

    def do_restart(self, arg=None):
        call('service {} restart'.format(options.service_name))
        

def main():
    with MongoClient(options.db) as mdb:
        dsn = urlparse.urlparse(options.db)
        db = mdb[dsn.path.lstrip('/')]
        cmd = AdmCmd(db=db)
        cmd.prompt = '--> '
        cmd.cmdloop()


if __name__ == '__main__':
    main()
