# -*- coding: utf-8 -*-
from __future__ import absolute_import

import logging
log = logging.getLogger(__name__)

from motorengine.metaclasses import DocumentMetaClass, classproperty
from sublayers_server.model.registry.odm.qs import CachebleQuerySet


# todo: Решить вопрос с регистрацией в метаклассе всех (возможно одноименных) поддокументов


class NodeMeta(DocumentMetaClass):
    _classes = {}
    _objects_cache = {}

    @property
    def objects_cache(cls):
        """
        @:return dict
        """
        return cls._objects_cache

    def get_class(cls, name):
        subnames = name.split('.')
        firstname = subnames[0]
        subnames = subnames[1:]
        c = cls._classes.get(firstname)
        for subname in subnames:
            if c is None:
                break
            c = getattr(c, subname, None)

        if c is None:
            raise NameError('Registry class {!r} is not found.'.format(name))

        return c

    @property
    def key_fields(cls):
        return {field_name for field_name, field in cls._fields.items() if getattr(field, 'identify', None)}

    @classmethod
    def _registry(cls, name, new_class):
        assert name not in cls._classes, 'Registry class {} already registered.'.format(name)
        cls._classes[name] = new_class

    def __new__(cls, name, bases, attrs):
        not_a_fields = frozenset(attrs.pop('__not_a_fields__', []))
        for base in bases:
            if hasattr(base, '__not_a_fields__'):
                not_a_fields |= frozenset(base.__not_a_fields__)

        new_class = super(NodeMeta, cls).__new__(cls, name, bases, attrs)
        setattr(new_class, 'objects', classproperty(lambda *args, **kw: CachebleQuerySet(new_class)))
        setattr(new_class, '__lazy__', False)
        setattr(new_class, '__collection__', 'registry')
        setattr(new_class, '__not_a_fields__', not_a_fields)
        cls._registry(name, new_class)
        return new_class


class SubclassMeta(NodeMeta):
    @classmethod
    def _registry(cls, name, new_class):
        pass
