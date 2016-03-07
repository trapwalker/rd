#!/usr/bin/env python
# -*- coding: utf-8 -*-
from __future__ import absolute_import

import sys
import os


def parent_folder(fn):
    return os.path.abspath(os.path.join(os.path.dirname(fn), '..'))


sys.path.append(parent_folder(__file__))

import logging.config

logging.config.fileConfig("logging.conf")
log = logging.getLogger(__name__)

import cmd2
from pymongo import MongoClient
from tornado.options import options

from sublayers_server import settings


def clean_collection(db, collection):
    db[collection].remove({}, multi=True)
    print 'Collection of "{}" cleaned. Now count is {}'.format(collection, db[collection].count())


class AdmCmd(cmd2.Cmd):

    def do_stat(self, arg):
        print '{:20}: {:6}'.format('Agents count', db.agents.count())
        print '{:20}: {:6}'.format('Profiles count', db.profiles.count())
    
    def do_reset(self, arg):
        '''
            Reset server DB by collection name
        '''
        if not arg:
            arg = 'agents'

        args = arg.split()

        for collection in args:
            clean_collection(db, collection)
            

if __name__ == '__main__':
    with MongoClient(options.db) as mdb:
        db = mdb[options.db_name]
        cmd = AdmCmd()
        cmd.prompt = '--> '
        cmd.cmdloop()
