﻿# -*- coding: utf-8 -*-
from __future__ import absolute_import

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.registry.odm.meta import NodeMeta
from sublayers_server.model.registry.odm.fields import StringField

from motorengine import Document
from tornado.concurrent import return_future
from bson import ObjectId


class AbstractDocument(Document):
    __metaclass__ = NodeMeta
    __classes__ = {}
    __cls__ = StringField()

    def find_embed_field(self, document, results, field_name, field):
        if self.is_embedded_field(field):
            value = document._values.get(field_name, None)
            if isinstance(value, Document):
                self.find_references(document=value, results=results)
            elif isinstance(value, basestring) or isinstance(value, ObjectId):
                def getter_with_instantiation(*av, **kw):
                    callback = kw.pop('callback')
                    def wrapper(proto):
                        if proto:
                            from sublayers_server.model.registry.tree import Node  # todo: Раскостылить
                            if isinstance(proto, Node):
                                callback(proto.instantiate())  # todo: проверить можно ли делать такой вызов
                        else:
                            callback(None)

                    load_function(callback=wrapper, *av, **kw)

                # todo: instantiate
                load_function = self._get_load_function(document, field_name, field.embedded_type)
                results.append([
                    getter_with_instantiation, #load_function,
                    value,
                    document._values,
                    field_name,
                    None
                ])

    def _get_load_function(self, document, field_name, document_type):
        value = document._values.get(field_name, None)
        if not isinstance(value, document_type):
            return super(AbstractDocument, self)._get_load_function(document, field_name, document_type)

        @return_future
        def fake_load_function(id, callback, **kwargs):
            import tornado.ioloop
            tornado.ioloop.IOLoop.instance().add_callback(callback, id)

        return fake_load_function

    def to_cache(self, *av):
        assert self._id
        keys = set(av)
        keys.add(self._id)
        for key in keys:
            self.__class__.objects_cache[key] = self

    @classmethod
    def search_in_cache(cls, **kw):
        key_fields = {'id', '_id', 'uri'}
        for key_name in set(kw.keys()) & key_fields:
            key = kw[key_name]
            if key:
                obj = cls.objects_cache.get(key)
                if obj:
                    return obj

    @classmethod
    def get_global_class_name(cls):
        return cls.__name__  # todo: add module importing path

    # def __init__(self, **kw):
    #     kw.setdefault('__cls__', self.get_global_class_name())
    #     #super(AbstractDocument, self).__init__(**kw)

    def __init__(self, _is_partly_loaded=False, _reference_loaded_fields=None, **kw):
        """
        :param _is_partly_loaded: is a flag that indicates if the document was
        loaded partly (with `only`, `exlude`, `fields`). Default: False.
        :param _reference_loaded_fields: dict that contains projections for
        reference fields if any. Default: None.
        :param kw: pairs of fields of the document and their values
        """  # полностью перекрыто для реализации field.set_value
        from motorengine.fields.dynamic_field import DynamicField
        kw.setdefault('__cls__', self.get_global_class_name())

        self._id = kw.pop('_id', None)
        self._values = {}
        self.is_partly_loaded = _is_partly_loaded

        if _reference_loaded_fields:
            self._reference_loaded_fields = _reference_loaded_fields
        else:
            self._reference_loaded_fields = {}

        for key, field in self._fields.items():
            default = field.default() if callable(field.default) else field.default
            self._values[field.name] = field.set_value(default) if hasattr(field, 'set_value') else default

        for key, value in kw.items():
            field = self._fields.get(key)
            if field:
                if hasattr(field, 'set_value'):
                    value = field.set_value(value)
            else:
                self._fields[key] = DynamicField(db_field="_%s" % key.lstrip('_'))
            self._values[key] = value

    def __setattr__(self, name, value):
        if name in self._fields:
            field = self._fields[name]
            self._values[name] = field.set_value(value) if hasattr(field, 'set_value') else value
        else:
            super(AbstractDocument, self).__setattr__(name, value)

    @classmethod
    def from_son(cls, dic, _is_partly_loaded=False, _reference_loaded_fields=None):
        klass_name = dic.get('__cls__')
        klass = cls.get_class(klass_name) if klass_name else cls  # tpdp: add warning if class not found
        # todo: Падать при инициализации, игнорировать с предупреждениями в процессе
        assert klass, 'Registry class {!r} is not found.'.format(klass_name)
        if cls is klass:
            return super(AbstractDocument, cls).from_son(dic, _is_partly_loaded=False, _reference_loaded_fields=None)
        else:
            return klass.from_son(dic, _is_partly_loaded=False, _reference_loaded_fields=None)

    def __repr__(self):
        return '{self.__class__.__name__}(\n{params})'.format(
            self=self,
            params=''.join([
                '\t{}={!r},\n'.format(k, v)
                for k, v in sorted(self.to_son().items() + [('_id', self._id)])
            ]),
        )
