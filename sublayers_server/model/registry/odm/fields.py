# -*- coding: utf-8 -*-
from __future__ import absolute_import

from motorengine.fields import *
from motorengine.utils import get_class
import six
from bson.objectid import ObjectId

from sublayers_server.model.registry.uri import URI


class UniReferenceField(ReferenceField):
    '''
    Field responsible for creating a reference to another document (Node) by _id or uri.
    '''

    def validate(self, value):
        # avoiding circular reference
        from motorengine import Document

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
