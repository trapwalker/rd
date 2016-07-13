# -*- coding: utf-8 -*-
from __future__ import absolute_import

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.registry.odm.meta import NodeMeta
from sublayers_server.model.registry.odm.fields import StringField, ListField, ReferenceField, EmbeddedDocumentField

from motorengine import Document
from tornado.concurrent import return_future
from bson import ObjectId
from collections import Counter

if __debug__:
    _call_stat = Counter()


class AbstractDocument(Document):
    __metaclass__ = NodeMeta
    __classes__ = {}
    _stat = Counter()

    __cls__ = StringField()

    def _get_load_function(self, document, field_name, document_type):
        if isinstance(document, list):
            return document_type.objects.get
        else:
            return super(AbstractDocument, self)._get_load_function(document, field_name, document_type)

    @return_future
    def load_references(self, fields=None, callback=None, alias=None):
        _call_stat[self.parent, self.uri, 'load_references'] += 1

        if callback is None:
            raise ValueError("Callback can't be None")

        references = self.find_references(document=self, fields=fields)
        reference_count = len(references)

        if not reference_count:
            callback({
                'loaded_reference_count': reference_count,
                'loaded_values': []
            })
            return

        for dereference_function, document_id, values_collection, field_name, fill_values_method in references:
            dereference_function(
                document_id,
                callback=self.handle_load_reference(
                    callback=callback,
                    references=references,
                    reference_count=reference_count,
                    values_collection=values_collection,
                    field_name=field_name,
                    fill_values_method=fill_values_method
                )
            )

    def find_references(self, document, fields=None, results=None, this_document_field=None):
        if results is None:
            results = []

        if isinstance(document, Document):
            if fields:
                fields = [
                    (field_name, field)
                    for field_name, field in document._fields.items()
                    if field_name in fields
                ]
            else:
                fields = [field for field in document._fields.items()]

            for field_name, field in fields:
                self.find_reference_field(document, results, field_name, field)
                self.find_list_field(document, results, field_name, field)
                self.find_embed_field(document, results, field_name, field)
        elif (
            document is not None and
            isinstance(this_document_field, ListField) and
            isinstance(this_document_field._base_field, (ListField, ReferenceField, EmbeddedDocumentField))
        ):
            field = this_document_field._base_field
            for i, value in enumerate(document):
                self.find_reference_field(document, results, i, field)
                self.find_list_field(document, results, i, field)
                self.find_embed_field(document, results, i, field)

        return results

    def find_embed_field(self, document, results, field_name, field):
        if self.is_embedded_field(field):
            value = (
                document._values.get(field_name, None)
                if isinstance(document, Document) else
                document[field_name]
            )

            if isinstance(value, Document):
                self.find_references(document=value, results=results)
            elif isinstance(value, basestring) or isinstance(value, ObjectId):
                def getter_with_instantiation(*av, **kw):
                    callback = kw.pop('callback')
                    def wrapper(proto):
                        if proto:
                            from sublayers_server.model.registry.tree import Node  # todo: Раскостылить
                            if isinstance(proto, Node):
                                callback(proto.instantiate())
                        else:
                            callback(None)

                    load_function(callback=wrapper, *av, **kw)

                load_function = (
                    self._bypass_load_function
                    if isinstance(value, field.embedded_type) else
                    self._get_load_function(document, field_name, field.embedded_type)
                )

                results.append([
                    getter_with_instantiation,
                    value,
                    document._values if isinstance(document, Document) else document,
                    field_name,
                    self.fill_values_collection
                ])

    def find_reference_field(self, document, results, field_name, field):
        if self.is_reference_field(field):
            value = (
                document._values.get(field_name, None)
                if isinstance(document, Document) else
                document[field_name]
            )
            load_function = (
                self._bypass_load_function
                if isinstance(value, field.reference_type) else
                self._get_load_function(document, field_name, field.reference_type)
            )
            if value is not None:
                results.append([
                    load_function,
                    value,
                    document._values if isinstance(document, Document) else document,
                    field_name,
                    self.fill_values_collection
                ])

    def find_list_field(self, document, results, field_name, field):
        if self.is_list_field(field):
            values = (
                document._values.get(field_name, None)
                if isinstance(document, Document) else
                document[field_name]
            )
            if values:
                self.find_references(document=values, results=results, this_document_field=field)

    @return_future
    def _bypass_load_function(self, id, callback, **kwargs):
        import tornado.ioloop
        tornado.ioloop.IOLoop.instance().add_callback(callback, id)

    def to_cache(self, *av):
        keys = set(av)
        if self._id:
            keys.add(self._id)
        assert keys
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
        if isinstance(dic, basestring):
            return dic  # todo: may be add async loading task to eventloop?
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
