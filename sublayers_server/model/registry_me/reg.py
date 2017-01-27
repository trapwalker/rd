# -*- coding: utf-8 -*-
from __future__ import absolute_import, print_function
import os
import sys
import logging
log = logging.getLogger(__name__)

if __name__ == '__main__':
    log = logging.getLogger()
    sys.path.append('../../..')
    log.level = logging.DEBUG
    log.addHandler(logging.StreamHandler(sys.stderr))


from sublayers_common.ctx_timer import Timer
from sublayers_server.model.registry_me.tree import Node

from collections import deque
from mongoengine import connect, Document, EmbeddedDocument
from mongoengine.fields import (
    IntField, StringField, UUIDField, ReferenceField, BooleanField,
    ListField, DictField, EmbeddedDocumentField,
    GenericReferenceField,
    MapField,
)


class Registry(Document):
    tree = MapField(field=EmbeddedDocumentField(document_type=Node))

    # def __init__(self, **kw):
    #     super(Registry, self).__init__(**kw)

    def _put(self, node, uri=None):
        uri = uri or node.uri
        added_node = self.tree.setdefault(uri, node)
        assert added_node is node, (
            'Registry already has same node: {added_node!r} by uri {uri!r}. Fail to put: {node!r}'.format(**locals())
        )

    def __getitem__(self, uri):
        # todo: support alternative path notations (list, relative, parametrized)
        return self.tree[uri]

    @classmethod
    def load(cls, path, mongo_store=True):
        all_nodes = []
        root = None
        stack = deque([(path, None)])
        with Timer(name='registryFS loader', logger=log) as timer:
            while stack:
                pth, owner = stack.pop()
                node = cls._load_node_from_fs(pth, owner)
                if node:
                    node.save()

                    all_nodes.append(node)
                    #node.to_cache()  # TODO: cache objects
                    if owner is None:
                        root = node  # todo: optimize
                    for f in os.listdir(pth):
                        next_path = os.path.join(pth, f)
                        if os.path.isdir(next_path) and not f.startswith('#') and not f.startswith('_'):
                            stack.append((next_path, node))

        log.info('Registry loading DONE: {} nodes ({:.3f}s).'.format(len(all_nodes), timer.duration))
        return root


REG = Registry()


if __name__ == '__main__':
    pass