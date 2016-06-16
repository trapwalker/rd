# -*- coding: utf-8 -*-
from __future__ import absolute_import

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.registry.odm.meta import NodeMeta
from sublayers_server.model.registry.odm.fields import StringField

from motorengine import Document
from tornado.concurrent import return_future


class AbstractDocument(Document):
    __metaclass__ = NodeMeta
    __classes__ = {}
    __cls__ = StringField()

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
            if callable(field.default):
                self._values[field.name] = field.set_value(field.default())
            else:
                self._values[field.name] = field.set_value(field.default)

        for key, value in kw.items():
            field = self._fields.get(key)
            if field:
                value = field.set_value(value)
            else:
                self._fields[key] = DynamicField(db_field="_%s" % key.lstrip('_'))
            self._values[key] = value

    def __setattr__(self, name, value):
        if name in self._fields:
            field = self._fields[name]
            self._values[name] = field.set_value(value)
        else:
            super(AbstractDocument, self).__setattr__(name, value)

    @classmethod
    def from_son(cls, dic, _is_partly_loaded=False, _reference_loaded_fields=None):
        klass_name = dic.get('__cls__')
        klass = cls.get_class(klass_name) if klass_name else cls  # tpdp: add warning if class not found

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
