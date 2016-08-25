# -*- coding: utf-8 -*-
from __future__ import absolute_import

import six
import motorengine.fields
from bson.objectid import ObjectId


class MetaFieldMixin(object):
    def __init__(self, name=None, caption=None, doc=None, tags=None, identify=False, **kw):
        super(MetaFieldMixin, self).__init__(**kw)
        self.name = name
        self.caption = caption
        self.doc = doc
        self.has_default = 'default' in kw
        self.identify = identify
        if tags is None:
            tags = set()
        elif isinstance(tags, basestring):
            tags = set(tags.split())
        else:
            tags = set(tags)

        self.tags = tags

    def set_value(self, value):
        return value


class BaseField             (MetaFieldMixin, motorengine.fields.BaseField            ): pass
class StringField           (MetaFieldMixin, motorengine.fields.StringField          ): pass
class BooleanField          (MetaFieldMixin, motorengine.fields.BooleanField         ): pass
class DateTimeField         (MetaFieldMixin, motorengine.fields.DateTimeField        ): pass
class UUIDField             (MetaFieldMixin, motorengine.fields.UUIDField            ): pass
class ReferenceField        (MetaFieldMixin, motorengine.fields.ReferenceField       ): pass  # reference_document_type
class URLField              (MetaFieldMixin, motorengine.fields.URLField             ): pass
class EmailField            (MetaFieldMixin, motorengine.fields.EmailField           ): pass
class IntField              (MetaFieldMixin, motorengine.fields.IntField             ): pass
class FloatField            (MetaFieldMixin, motorengine.fields.FloatField           ): pass
class DecimalField          (MetaFieldMixin, motorengine.fields.DecimalField         ): pass
class BinaryField           (MetaFieldMixin, motorengine.fields.BinaryField          ): pass
class JsonField             (MetaFieldMixin, motorengine.fields.JsonField            ): pass

class ListField             (MetaFieldMixin, motorengine.fields.ListField            ):  # base_field
    def __init__(self, base_field=None, reinst=False, *args, **kw):
        super(ListField, self).__init__(base_field=base_field, *args, **kw)
        self.reinst = reinst

        default = kw.pop('default', None)
        if default is None:
            self.default = None


class EmbeddedDocumentField(MetaFieldMixin, motorengine.fields.EmbeddedDocumentField):
    # embedded_document_type
    def __init__(self, embedded_document_type=None, reinst=False, *args, **kw):
        super(EmbeddedDocumentField, self).__init__(embedded_document_type=embedded_document_type, *args, **kw)
        self.reinst = reinst

    def from_son(self, value):
        if value is None:
            return None

        if isinstance(value, dict):
            value['embedded'] = True
        return self.embedded_type.from_son(value)


class UniReferenceField(ReferenceField): # todo: replace to mixed
    '''
    Field responsible for creating a reference to another document (Node) by _id or uri.
    '''
    def __init__(self, reference_document_type=None, *args, **kw):
        if reference_document_type is None:
            from sublayers_server.model.registry.odm import AbstractDocument
            reference_document_type = AbstractDocument
        super(UniReferenceField, self).__init__(reference_document_type=reference_document_type, *args, **kw)

    def validate(self, value):
        # avoiding circular reference
        from motorengine import Document
        from sublayers_server.model.registry.uri import URI

        if not isinstance(self.reference_type, type) or not issubclass(self.reference_type, Document):
            raise ValueError(
                "The field 'reference_document_type' argument must be a subclass of Document, not '%s'." % (
                    str(self.reference_type)
                )
            )

        if value is not None and not isinstance(value, (self.reference_type, ObjectId, six.string_types)):
            return False

        return (
            value is None 
            or isinstance(value, ObjectId)
            or isinstance(value, self.reference_type)
            or isinstance(value, six.string_types) and URI.try_or_default(value) and True
            or hasattr(value, 'uri') and value.uri is not None
            or hasattr(value, '_id') and value._id is not None
        )

    def to_son(self, value):
        if value is None:
            return None

        if isinstance(value, ObjectId):
            return value

        if isinstance(value, six.string_types):
            return value

        if hasattr(value, 'uri') and value.uri is not None:
            return str(value.uri)

        return value._id
