# -*- coding: utf-8 -*-
from __future__ import absolute_import

import logging
log = logging.getLogger(__name__)

import six
import re
from mongoengine import Document
from mongoengine.fields import URLField, ReferenceField, get_document, DBRef
from mongoengine.queryset import DO_NOTHING, QuerySet
from bson.objectid import ObjectId


class RegistryURIField(URLField):
    _URL_REGEX = re.compile(
        r'^(?:[a-z0-9\.\-]*)://'  # scheme is validated separately
	    #r'(?:[a-z_][^/]+)?'  # host-like collection name
        r'(?:/?|[/?]\S+)$', re.IGNORECASE)
    _URL_SCHEMES = ['reg',]

    def __init__(self, **kwargs):
        super(URLField, self).__init__(verify_exists=False, **kwargs)

    def validate(self, value):
        # Check first if the scheme is valid
        scheme = value.split('://')[0].lower()
        if scheme not in self.schemes:
            self.error('Invalid scheme {} in URL: {}'.format(scheme, value))
            return

        # Then check full URL
        if not self.url_regex.match(value):
            self.error('Invalid URL: {}'.format(value))
            return


class RegistryReferenceField(ReferenceField):
    def __init__(self, **kwargs):
        """Initialises the Registry Reference Field.
        """
        super(RegistryReferenceField, self).__init__(reverse_delete_rule=DO_NOTHING, dbref=False, **kwargs)

    def __get__(self, instance, owner):
        """Descriptor to allow lazy dereferencing.
        """
        if instance is None:
            # Document class being used rather than a document object
            return self

        # Get value from document instance if available
        value = instance._data.get(self.name)
        self._auto_dereference = instance._fields[self.name]._auto_dereference
        # Dereference DBRefs
        if self._auto_dereference and isinstance(value, DBRef):
            if hasattr(value, 'cls'):
                # Dereference using the class type specified in the reference
                cls = get_document(value.cls)
            else:
                cls = self.document_type
            value = cls._get_db().dereference(value)
            if value is not None:
                instance._data[self.name] = cls._from_son(value)

        return super(ReferenceField, self).__get__(instance, owner)

    def to_mongo(self, document):
        if isinstance(document, DBRef):
            log.warning("{self.__class__.__name__} value is a DBRef: {document}".format(**locals()))
            if not self.dbref:
                return document.id
            return document

        if isinstance(document, Document):
            #if getattr(document, 'uri', None):

            # We need the id from the saved object to create the DBRef
            id_ = document.pk
            if id_ is None:
                self.error('You can only reference documents once they have'
                           ' been saved to the database')

            # Use the attributes from the document instance, so that they
            # override the attributes of this field's document type
            cls = document
        else:
            id_ = document
            cls = self.document_type

        id_field_name = cls._meta['id_field']
        id_field = cls._fields[id_field_name]

        id_ = id_field.to_mongo(id_)
        if self.document_type._meta.get('abstract'):
            collection = cls._get_collection_name()
            return DBRef(collection, id_, cls=cls._class_name)
        elif self.dbref:
            collection = cls._get_collection_name()
            return DBRef(collection, id_)

        return id_

    def to_python(self, value):
        """Convert a MongoDB-compatible type to a Python type.
        """
        if (not self.dbref and
                not isinstance(value, (DBRef, Document, EmbeddedDocument))):
            collection = self.document_type._get_collection_name()
            value = DBRef(collection, self.document_type.id.to_python(value))
        return value

    def prepare_query_value(self, op, value):
        if value is None:
            return None
        super(ReferenceField, self).prepare_query_value(op, value)
        return self.to_mongo(value)

    def validate(self, value):

        if not isinstance(value, (self.document_type, DBRef)):
            self.error("A ReferenceField only accepts DBRef or documents")

        if isinstance(value, Document) and value.id is None:
            self.error('You can only reference documents once they have been '
                       'saved to the database')

        if self.document_type._meta.get('abstract') and \
                not isinstance(value, self.document_type):
            self.error('%s is not an instance of abstract reference'
                    ' type %s' % (value._class_name,
                        self.document_type._class_name)
                    )


    def lookup_member(self, member_name):
        return self.document_type._fields.get(member_name)





# class UniReferenceField(ReferenceField): # todo: replace to mixed
#     '''
#     Field responsible for creating a reference to another document (Node) by _id or uri.
#     '''
#     def __init__(self, reference_document_type=None, *args, **kw):
#         if reference_document_type is None:
#             from sublayers_server.model.registry.odm import AbstractDocument
#             reference_document_type = AbstractDocument
#             log.warning('Undefined reference_document_type of field')
#
#         super(UniReferenceField, self).__init__(reference_document_type=reference_document_type, *args, **kw)
#
#     def validate(self, value):
#         # avoiding circular reference
#         from motorengine import Document
#         from sublayers_server.model.registry.uri import URI
#
#         if not isinstance(self.reference_type, type) or not issubclass(self.reference_type, Document):
#             raise ValueError(
#                 "The field 'reference_document_type' argument must be a subclass of Document, not '%s'." % (
#                     str(self.reference_type)
#                 )
#             )
#
#         if value is not None and not isinstance(value, (self.reference_type, ObjectId, six.string_types)):
#             return False
#
#         return (
#             value is None
#             or isinstance(value, ObjectId)
#             or isinstance(value, self.reference_type)
#             or isinstance(value, six.string_types) and URI.try_or_default(value) and True
#             or hasattr(value, 'uri') and value.uri is not None
#             or hasattr(value, '_id') and value._id is not None
#         )
#
#     def to_son(self, value):
#         if value is None:
#             return None
#
#         if isinstance(value, ObjectId):
#             return value
#
#         if isinstance(value, six.string_types):
#             return value
#
#         if hasattr(value, 'uri') and value.uri is not None:
#             return str(value.uri)
#
#         return value._id
