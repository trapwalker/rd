# -*- coding: utf-8 -*-
__author__ = 'svp'

import logging
log = logging.getLogger(__name__)

from tree import Node, PersistentMeta


class DeclareNodeMeta(type):
    def __new__(mcs, name, bases, attrs):
        assert bases
        parent = bases[0]
        assert isinstance(parent, Node)
        cls = bases[1] if len(bases) > 1 else parent.__class__
        assert isinstance(cls, PersistentMeta)
        return cls(name=name, parent=parent, values=attrs)

