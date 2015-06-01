# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

import copy_reg
from collections import Callable
from pprint import pprint as pp, pformat


class Node(object):
    def __init__(self, name, owner=None, parent=None, attrs=None):
        self._owner = None
        self.name = name
        self.parent = parent
        self.attrs = attrs or {}
        self.owner = owner

    @property
    def owner(self):
        return self._owner

    @owner.setter
    def owner(self, value):
        self._owner = value
        if value and owner.parent and hasattr(owner.parent, name):
            parent = getattr(owner.parent, name)


    @property
    def path(self):
        return (self.owner.path if self.owner else ()) + (self.name)

    @property
    def fullname(self):
        return '.'.join(self.path)

    def __getattr__(self, item):
        if item in self.attrs:
            return self.attrs[item]
        if self.parent:
            return getattr(self.parent, item)
        else:
            raise AttributeError('{} has no attribute {} in parent line'.format(self.fullname, item))



if __name__ == '__main__':
    import sys
    log.level = logging.DEBUG
    log.addHandler(logging.StreamHandler(sys.stderr))

    from pickle import dumps, loads
    import jsonpickle as jp
    
    
