# -*- coding: utf-8 -*-
from __future__ import absolute_import, print_function
import os
import sys
import logging
log = logging.getLogger(__name__)

from sublayers_common.ctx_timer import Timer
from sublayers_server.model.registry_me.tree import Node

from collections import deque
from mongoengine import connect, Document, EmbeddedDocument
from mongoengine.fields import (
    IntField, StringField, UUIDField, ReferenceField, BooleanField,
    ListField, DictField, EmbeddedDocumentField,
    GenericReferenceField,
)


class Registry(Document):
    root = EmbeddedDocumentField(document_type=Node)

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
