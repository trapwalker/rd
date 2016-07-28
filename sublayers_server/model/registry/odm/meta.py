# -*- coding: utf-8 -*-
from __future__ import absolute_import

import logging
log = logging.getLogger(__name__)

from motorengine.metaclasses import DocumentMetaClass, classproperty
from sublayers_server.model.registry.odm.qs import CachebleQuerySet


class NodeMeta(DocumentMetaClass):
    _classes = {}
    _objects_cache = {}

    @property
    def objects_cache(cls):
        """
        @:return dict
        """
        return cls._objects_cache

    @property
    def key_fields(cls):
        return {field_name for field_name, field in cls._fields.items() if getattr(field, 'identify', None)}

    def __new__(cls, name, bases, attrs):
        new_class = super(NodeMeta, cls).__new__(cls, name, bases, attrs)
        cls._classes[name] = new_class
        setattr(new_class, 'objects', classproperty(lambda *args, **kw: CachebleQuerySet(new_class)))

        setattr(new_class, '__lazy__', False)
        setattr(new_class, '__collection__', 'registry')

        return new_class

    def get_class(cls, name):
        return cls._classes.get(name)
