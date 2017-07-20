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


from sublayers_common import yaml_tools
from sublayers_common.ctx_timer import Timer
from sublayers_server.model.registry_me.uri import URI
from sublayers_common.debug_tools import warn_calling

import six
import codecs
import copy
from uuid import uuid1 as get_uuid
from collections import deque, Counter
from fnmatch import fnmatch

from mongoengine import connect, Document, EmbeddedDocument, ValidationError
from mongoengine.queryset.queryset import QuerySetNoDeRef
from mongoengine.base import get_document
from mongoengine.base.metaclasses import DocumentMetaclass
from mongoengine.errors import DoesNotExist
from mongoengine.queryset import DO_NOTHING
from mongoengine.fields import BaseField, ReferenceField
from mongoengine import (
    BooleanField,
    IntField,
    FloatField,
    StringField,
    UUIDField,
    DateTimeField,
    ListField,
    DictField,
    MapField,
    EmbeddedDocumentField,
    GenericEmbeddedDocumentField,
    #GenericReferenceField,
)
from sublayers_server.model.registry_me.odm_position import PositionField, Position

CONTAINER_FIELD_TYPES_SIMPLE = (ListField, DictField)  # TODO: support other field types
CONTAINER_FIELD_TYPES = CONTAINER_FIELD_TYPES_SIMPLE + (EmbeddedDocumentField,)

IGNORE_WRONG_LINKS = True  # False
CACHE_INHERITED_FIELDS = True  # Локальное кэширование унаследованных значений нода


class RegistryError(Exception):
    pass


class RegistryNodeFormatError(RegistryError):
    pass


class RegistryNodeIsNotFound(RegistryError):
    pass


class Nil:
    """Impossible value of field"""


def field_getter_decorator(getter):
    def new_getter(self, instance, owner):
        """Descriptor for retrieving a value from a field in a document.
        """
        if instance is None:
            # Document class being used rather than a document object
            return self

        if __debug__:
            if field_getter_decorator._debug:
                log.debug('Inheritance getter: {self.__class__.__name__}({self.name}).__get__({it}, {owner})'.format(it=type(instance), **locals()))

        # Get value from document instance if available
        if instance._initialised:
            name = self.name
            _data = instance._data
            if isinstance(instance, Node) and not getattr(self, 'not_inherited', False):
                _empty_overrided_fields = _data['_empty_overrided_fields']
                if name not in _empty_overrided_fields and name not in _data:
                    # try to inherite parent value
                    assert name not in _data, 'Attribute {} marked as inherited, but it present in _dict'.format(name)

                    inherited_cache = instance._inherited_cache
                    if inherited_cache is not None:
                        res = inherited_cache.get(name, Nil)
                        if res is not Nil:
                            return res

                    parent = instance.parent
                    if parent is not None and name in type(parent)._fields:
                        res = getattr(parent, name)
                        if inherited_cache is not None:
                            inherited_cache[name] = res
                        return res

                    root_default = getattr(self, 'root_default', None)
                    root_default = root_default() if root_default is not None and callable(root_default) else root_default
                    if root_default is None:
                        return root_default
                    return self.to_python(root_default)

        return getter(self, instance, owner)

    new_getter._old_getter = getter
    return new_getter

field_getter_decorator._debug = False
RECURSIVE_REFERENCE_CONSTANT = 'self'


class RegistryLinkField(BaseField):
    def __init__(self, document_type='Node', **kwargs):
        if (
            not isinstance(document_type, six.string_types) and
            not issubclass(document_type, Node)
        ):
            self.error('Argument to ReferenceField constructor must be a '
                       'document class or a string')

        self.dbref = False
        self.document_type_obj = document_type
        self.reverse_delete_rule = DO_NOTHING
        BaseField.__init__(self, **kwargs)

    @property
    def document_type(self):
        if isinstance(self.document_type_obj, six.string_types):
            if self.document_type_obj == RECURSIVE_REFERENCE_CONSTANT:
                self.document_type_obj = self.owner_document
            else:
                self.document_type_obj = get_document(self.document_type_obj)
        return self.document_type_obj

    @field_getter_decorator
    def __get__(self, instance, owner):
        """Descriptor to allow lazy dereferencing."""
        if instance is None:  # Document class being used rather than a document object
            return self

        # Get value from document instance if available
        value = instance._data.get(self.name)
        self._auto_dereference = type(instance)._fields[self.name]._auto_dereference
        global REGISTRY

        if value is not None and self._auto_dereference and isinstance(value, basestring) and REGISTRY is not None:
            dereferenced = None
            try:
                dereferenced = self.to_python(value)
            except RegistryNodeIsNotFound as e:
                if not IGNORE_WRONG_LINKS:
                    raise DoesNotExist('Trying to dereference unknown document %s' % value)

            if dereferenced is None:
                assert IGNORE_WRONG_LINKS
            else:
                instance._data[self.name] = dereferenced

        return super(RegistryLinkField, self).__get__(instance, owner)

    def to_mongo(self, document):
        if document is None:
            return

        elif isinstance(document, basestring):
            # todo: normalize URI
            return document

        elif isinstance(document, Node):
            assert document.uri, 'Registry node do not has URI to link them: {!r}'.format(document)
            return document.uri

        else:
            raise TypeError('Linked node type is not supported: {!r}'.format(document))

    def to_python(self, value):
        """Convert a MongoDB-compatible type to a Python type."""
        if value is None or isinstance(value, Node):
            return value

        assert isinstance(value, six.string_types), 'wrong node link value type: {!r}'.format(value)

        global REGISTRY
        if REGISTRY is None:
            return value

        try:
            return REGISTRY.get(value)
        except RegistryNodeIsNotFound as e:
            log.warning("URI resolve fail to LINK {value!r}{fieldname}".format(
                fieldname=self.name and ' (field: {})'.format(self.name) or '', **locals())
            )
            if not IGNORE_WRONG_LINKS:
                raise e

    def validate(self, value, **kw):

        if isinstance(value, basestring):
            # todo: validate registry URI
            pass

        elif not isinstance(value, self.document_type):
            self.error('A RegistryLinkField only accepts URI or Node ({})'.format(self.document_type))

        if isinstance(value, Node) and value.uri is None:
            self.error('You can only reference nodes once they has an URI')

    def prepare_query_value(self, op, value):
        if value is None:
            return None
        super(ReferenceField, self).prepare_query_value(op, value)
        return self.to_mongo(value)

    def lookup_member(self, member_name):
        return self.document_type._fields.get(member_name)


CONTAINER_OR_RL_FIELD_TYPES = CONTAINER_FIELD_TYPES + (RegistryLinkField,)


class EmbeddedNodeField(EmbeddedDocumentField):

    def __init__(self, document_type='Node', **kwargs):
        super(EmbeddedNodeField, self).__init__(document_type, **kwargs)

    def to_python(self, value):
        if isinstance(value, basestring):
            global REGISTRY
            if REGISTRY is None:
                return value

            try:
                return REGISTRY.make_node_by_uri(value)
            except RegistryNodeIsNotFound as e:
                log.warning("URI resolve fail to MAKE {value!r}{fieldname}".format(
                    fieldname=self.name and '(field: {})'.format(self.name) or '', **locals())
                )
                if IGNORE_WRONG_LINKS:
                    return
                else:
                    raise e

        elif value is None:
            return

        # elif isinstance(value, dict):
        #     parent = value.pop('parent', None)
        #     if isinstance(parent, basestring):
        #         parent = REGISTRY.get(parent)
        #     cls = self.document_type if parent is None else type(parent)
        #     return cls(parent=parent, **value)

        # Устанавливаем класс от родителя, если не указан явно. Если родителя нет, класс будет взят из описания поля
        if isinstance(value, dict) and '_cls' not in value:
            parent = value.get('parent', None)
            if parent is not None and not isinstance(parent, Node):
                parent = REGISTRY.get(parent)
                value.setdefault('_cls', parent._cls)

        return super(EmbeddedNodeField, self).to_python(value)

    def __set__(self, instance, value):
        if instance._initialised:
            value = self.to_python(value)

        super(EmbeddedNodeField, self).__set__(instance, value)


class NodeMetaclass(DocumentMetaclass):
    def __new__(cls, name, bases, attrs):
        super_new = super(NodeMetaclass, cls).__new__
        new_cls = super_new(cls, name, bases, attrs)

        # Fields processing  # todo: ##OPTIMIZE: use dict instead
        new_cls._inheritable_fields = set()
        new_cls._non_inheritable_fields = set()
        new_cls._deferred_init_fields = set()

        for name, field in new_cls._fields.iteritems():
            # Fields inheritance indexing
            not_inherited = getattr(field, 'not_inherited', False)
            if not_inherited:
                new_cls._non_inheritable_fields.add(name)
            else:
                new_cls._inheritable_fields.add(name)

            if isinstance(field, EmbeddedNodeField):
                new_cls._deferred_init_fields.add(name)

            # Field tags normalization
            tags = getattr(field, 'tags', None)
            if tags is not None and not isinstance(tags, set):
                if isinstance(tags, basestring):
                    tags = set(tags.split())
                else:
                    tags = set(tags)
                field.tags = tags

        return new_cls


class RLResolveMixin(object):
    def is_field_inherited(self, name):
        return False

    def _resolve_field_value(self, field, value):
        if value is None:
            return
        elif isinstance(field, RegistryLinkField) and isinstance(value, basestring):
            return field.to_python(value)
        elif not isinstance(field, CONTAINER_FIELD_TYPES):
            return value  # todo: optimize

        if isinstance(field, EmbeddedDocumentField):
            if hasattr(type(value), 'rl_resolve'):
                value.rl_resolve()
            expanded_value = value
        elif isinstance(field, ListField):
            # TODO: Может быть нужо пересоздавать и переприсваивать контейнеры? Чтобы прописался _instance
            expanded_value = value
            skip_count = 0
            for i, v in enumerate(value):
                if v is not None:
                    new_v = self._resolve_field_value(field.field, v)
                    if new_v is None:
                        assert IGNORE_WRONG_LINKS, 'Link {} is not expanded well, But IGNORE_WRONG_LINKS={}'.format(
                            v, IGNORE_WRONG_LINKS
                        )
                        skip_count += 1
                    else:
                        expanded_value[i - skip_count] = new_v
            if skip_count:
                expanded_value = expanded_value[:len(expanded_value) - skip_count]
        elif isinstance(field, DictField):
            expanded_value = value
            for k, v in value.iteritems():
                if v is not None:
                    new_v = self._resolve_field_value(field.field, v)
                    if new_v is None:
                        assert IGNORE_WRONG_LINKS, 'Link {} is not expanded well, But IGNORE_WRONG_LINKS={}'.format(
                            v, IGNORE_WRONG_LINKS
                        )
                        del expanded_value[k]
                    else:
                        expanded_value[k] = new_v
        else:
            return value

        return expanded_value

    def rl_resolve(self):
        cls = type(self)
        for field_name, field in cls._fields.iteritems():
            value = self._data.get(field_name, None)
            if value is not None:
                value = self._resolve_field_value(field, value)
                self._dict[field_name] = value


class SubdocToolsMixin(object):
    def to_string(self, indent=0, indent_size=4, keys_alignment=True):
        d = self.to_mongo()
        keys_width = max(map(len, d.keys())) if d and keys_alignment and indent_size else 1

        def prepare_value(value):
            if isinstance(value, Node):
                value = value.to_string(
                    indent=indent + 1 if indent_size else indent,
                    indent_size=indent_size,
                    keys_alignment=keys_alignment,
                )
            else:
                value = repr(value)

            if isinstance(value, basestring) and '\n' in value and (indent_size or indent):
                value = (u'\n' + u' ' * (indent + 2) * indent_size).join(value.split('\n'))

            return value

        return '{self.__class__.__name__}({nl}{params})'.format(
            self=self,
            nl='\n' if indent_size else '',
            params=('' if indent_size else ' ').join([
                '{tab}{k:{w}}{eq_space}={eq_space}{v},{nl}'.format(
                    k=k,
                    v=prepare_value(v),
                    w=keys_width,
                    eq_space=' ' if keys_width > 1 else '',
                    tab='\t' if indent_size else '',  # todo: replace '\t' to ' '*indent_size
                    nl='\n' if indent_size else '',
                )
                for k, v in sorted(d.items())
            ]),
        )


class DynamicSubdoc(EmbeddedDocument, SubdocToolsMixin):
    _dynamic = True
    meta = dict(
        allow_inheritance=True,
    )

    def __nonzero__(self):
        return True

    @warn_calling()
    def __len__(self):
        return super(DynamicSubdoc, self).__len__()

    def __str__(self):
        return self.to_string()


class Subdoc(EmbeddedDocument, SubdocToolsMixin, RLResolveMixin):
    __metaclass__ = NodeMetaclass
    _dynamic = False
    STRICT = True
    meta = dict(
        allow_inheritance=True,
    )
    __cls__ = StringField(caption=u"Deprecated class name", not_inherited=True)

    # def __init__(self, **kw):
    #     cls = self.__class__
    #     only_fields = kw.pop('__only_fields', None) or (cls._inheritable_fields | cls._deferred_init_fields)
    #     super(Subdoc, self).__init__(__only_fields=only_fields, **kw)

    #@warn_calling()  # todo: disable dereference
    def __nonzero__(self):
        return True

    @warn_calling()
    def __len__(self):
        return super(Subdoc, self).__len__()

    def iter_attrs(self, tags=None, classes=None):
        # todo: add params: tags_need, tags_deny
        if isinstance(tags, basestring):
            tags = set(tags.split())
        elif tags is not None:
            tags = set(tags)

        for name, attr in type(self)._fields.items():
            field_tags = getattr(attr, 'tags', None)
            if (
                (tags is None or field_tags is not None and field_tags & tags) and
                (classes is None or isinstance(attr, classes))
            ):
                getter = lambda: getattr(self, name)
                yield name, attr, getter

    def __str__(self):
        return self.to_string()

    def as_client_dict(self):  # todo: rename to 'to_son_client'
        def clean_value(field, value):
            if value is None:
                return value

            if hasattr(value, 'as_client_dict'):
                return value.as_client_dict()

            if isinstance(field, ListField):
                subfield = field.field
                return [clean_value(subfield, v) for v in value or ()]

            if isinstance(field, DictField):
                subfield = field.field
                return {k: clean_value(subfield, v) for k, v in value.iteritems()}

            assert not hasattr(value, '_instance'), 'Unsupported value {!r} of field {!r} to serializtion by as_client_dict'.format(value, field)
            return value

        with Timer() as tm:
            d = {}
            for name, attr, getter in self.iter_attrs(tags='client'):
                d[name] = clean_value(attr, getter())

        if tm.duration > 0.3:
            log.warning('!!!! DURATION {tm.duration:.4f} subdoc.as_client_dict({self!r})'.format(**locals()))

        return d

    # def root_instance(self):
    #     # todo: cache it
    #     last_instance = self
    #     instance = self
    #     while instance:
    #         last_instance = instance
    #         instance = getattr(instance, '_instance', None)
    #
    #     return last_instance

    def __setattr__(self, key, value):
        if key != '_initialised' and getattr(self, '_initialised', None):
            field = type(self)._fields.get(key)  # todo: support dynamic fields too
            if value is not None and isinstance(field, CONTAINER_OR_RL_FIELD_TYPES):
                value = self._expand_field_value(field, value)

        super(Subdoc, self).__setattr__(key, value)

    def instantiate(self, _only_fields=None, **kw):
        data = {}
        fields = self._fields if _only_fields is None else _only_fields
        for field_name in fields:
            if field_name in self._data:
                field = self._fields[field_name]
                value = self._data[field_name]
                data[field_name] = self._copy_field_value(field, value)

        data.update(kw)
        return type(self)(**data)

    def _copy_field_value(self, field, value):
        if not isinstance(field, CONTAINER_FIELD_TYPES) or value is None:
            return value  # todo: optimize
        if isinstance(field, EmbeddedDocumentField) and isinstance(value, Subdoc):
            return value.instantiate()
        elif isinstance(field, EmbeddedDocumentField) and isinstance(value, EmbeddedDocument):
            return copy.deepcopy(value)
        elif isinstance(field, ListField):
            return [self._copy_field_value(field.field, v) for v in value]
        elif isinstance(field, DictField):
            return {k: self._copy_field_value(field.field, v) for k, v in value.iteritems()}
        elif isinstance(field, EmbeddedDocumentField) and isinstance(value, dict):
            return field.to_python(value)
        elif isinstance(field, EmbeddedNodeField) and isinstance(value, basestring):
            return field.to_python(value)
        else:
            log.warning('Specify type of expanding value {!r} of field {!r} in {!r}'.format(value, field, self))
            return value

    def _expand_field_value(self, field, value):
        if not isinstance(field, CONTAINER_FIELD_TYPES):
            return value  # todo: optimize

        if isinstance(field, EmbeddedDocumentField) and isinstance(value, Subdoc):
            expanded_value = value.expand_links()
        elif isinstance(field, EmbeddedDocumentField) and isinstance(value, EmbeddedDocument):
            expanded_value = value
        elif isinstance(field, EmbeddedDocumentField) and isinstance(value, dict):
            expanded_value = field.to_python(value)
            if hasattr(expanded_value, 'expand_links'):
                expanded_value.expand_links()
        elif isinstance(field, EmbeddedNodeField) and isinstance(value, basestring):
            expanded_value = field.to_python(value)
            if expanded_value is not None:
                expanded_value.expand_links()  # todo: перенести в инстанцирование
        elif isinstance(field, ListField):
            # TODO: Может быть нужо пересоздавать и переприсваивать контейнеры? Чтобы прописался _instance
            expanded_value = value
            skip_count = 0
            for i, v in enumerate(value):
                if v is not None:
                    new_v = self._expand_field_value(field.field, v)
                    if new_v is None:
                        assert IGNORE_WRONG_LINKS, 'Link {} is not expanded well, But IGNORE_WRONG_LINKS={}'.format(
                            v, IGNORE_WRONG_LINKS
                        )
                        skip_count += 1
                    else:
                        expanded_value[i - skip_count] = new_v
            if skip_count:
                expanded_value = expanded_value[:len(expanded_value) - skip_count]
        elif isinstance(field, DictField):
            expanded_value = value
            for k, v in value.iteritems():
                if v is not None:
                    new_v = self._expand_field_value(field.field, v)
                    if new_v is None:
                        assert IGNORE_WRONG_LINKS, 'Link {} is not expanded well, But IGNORE_WRONG_LINKS={}'.format(
                            v, IGNORE_WRONG_LINKS
                        )
                        del expanded_value[k]
                    else:
                        expanded_value[k] = new_v
        else:
            expanded_value = field.to_python(value)
            if field.__class__.__name__ != 'PositionField':
                log.warning('Specify type of expanding value {!r} of field {!r} in {!r}'.format(value, field, self))

        return expanded_value

    def expand_links(self):
        _exp_cnt = STAT.expand(self)
        if _exp_cnt:
            return self

        #print('{:30}::{}'.format(self.__class__.__name__, getattr(self, 'uri', '---')))
        for field_name, field in type(self)._fields.items():
            if isinstance(field, CONTAINER_OR_RL_FIELD_TYPES):
                if not self.is_field_inherited(field_name) or getattr(field, 'reinst', False):
                    value = getattr(self, field_name)
                    setattr(self, field_name, value)

        if isinstance(self, Node) and self._need_reinst:
            self._reinst()

        return self

    def is_field_inherited(self, name):
        return False


########################################################################################################################
class Node(Subdoc, SubdocToolsMixin, RLResolveMixin):
    #__slots__ = ('_uri',)
    #__metaclass__ = NodeMetaclass
    _dynamic = False
    meta = dict(
        allow_inheritance=True,
    )
    _empty_overrided_fields = ListField(field=StringField(), not_inherited=True)
    uri = StringField(caption=u'Уникальный адрес узла в реестре (None для EmbeddedNode)', not_inherited=True)
    name = StringField(caption=u"Техническое имя в пространстве имён узла-контейнера (owner)", not_inherited=True)
    parent = RegistryLinkField(document_type='self', not_inherited=True)
    owner = RegistryLinkField(document_type='self', not_inherited=True)
    uid = UUIDField(default=get_uuid, unique=True, not_inherited=True, tags={"client"})
    #is_instant = BooleanField(default=False, not_inherited=True, doc=u"Признак инкапсулированной декларации объекта")
    abstract = BooleanField(default=True, not_inherited=True, doc=u"Абстракция - Признак абстрактности узла")
    title = StringField(caption=u"Название", tags={"client"})
    can_instantiate = BooleanField(root_default=True, doc=u"Инстанцируемый - Признак возможности инстанцирования")
    doc = StringField(caption=u"Описание узла реестра")
    tags = ListField(field=StringField(), not_inherited=True, caption=u"Теги", doc=u"Набор тегов объекта")

    #uri = StringField(unique=True, null=True, not_inherited=True)
    subnodes = MapField(field=EmbeddedNodeField(), not_inherited=True)
    # todo: make `owner` property
    filename = StringField(caption=u"Имя файла, с декларацией объекта", not_inherited=True)

    def __init__(self, parent=None, _uri=None, _empty_overrided_fields=None, _reg_init=False, **kw):
        cls = type(self)
        _fields = cls._fields
        _inheritable_fields = cls._inheritable_fields
        extra = {}
        only_fields = kw.pop('__only_fields', None)

        if _uri:
            for k, v in _uri.params:
                # todo: Support deep attributes detalization in URI params (subnode.attr -> subnode__attr)
                field = _fields.get(k, None)
                if field and k not in kw:
                    # todo: skip errors with warnings
                    try:
                        # todo: decode escape chars
                        v = field.to_python(v)
                    except Exception as e:
                        log.warning("Wrong value {!r} of param {!r} in URI {}: {!r}".format(v, k, _uri, e))
                else:
                    log.warning("Unknown field {!r} in URI {}".format(k, _uri))
                extra[k] = v

        extra.update(kw)

        if parent is not None and not isinstance(parent, basestring) and not parent.uri:
            # Если наследуемся от inline-нода, запоминаем его как прототип, а родителем считаем его родителя
            proto = parent
            proto_class = type(proto)
            parent = parent.parent

            for k, v in proto._data.items():
                field = proto_class._fields.get(k, None)
                if field and not getattr(field, 'not_inherited', False):
                    extra[k] = self._copy_field_value(field, v)  # todo: ##OPTIMIZE

        _empty_overrided_fields = list(
            {k for k, v in extra.iteritems() if v is None and k in _inheritable_fields} |
            set(_empty_overrided_fields or {})
        )  # todo: Make SetField

        # Формируем список имён полей блокирующий установку наследуемых полей в значения по умолчанию
        if not only_fields:
            only_fields = cls._inheritable_fields | cls._deferred_init_fields  # todo: Убедиться, что _deferred_init_fields еще нужен

        super(Node, self).__init__(
            parent=parent,
            __only_fields=only_fields,
            _empty_overrided_fields=_empty_overrided_fields,
            **extra
        )
        self._inherited_cache = {} if CACHE_INHERITED_FIELDS else None
        self._need_reinst = False
        global REGISTRY
        if isinstance(parent, Node) and REGISTRY.loading != 'preloading':
            self._reinst()
        else:
            self._need_reinst = parent is not None

    def is_field_inherited(self, name):
        return name not in self._data and name not in self._empty_overrided_fields

    def _reinst(self):
        parent = self.parent
        _overrided = set(self._data.keys()) | set(self._empty_overrided_fields)

        for field_name, field in type(parent)._fields.iteritems():  # todo: ##OPTIMIZE: use _inheritable_fields list
            if (
                not getattr(field, 'not_inherited', False)
                and getattr(field, 'reinst', False)
                and field_name not in _overrided  # todo: may be need to use is_field_inherited
            ):
                value = getattr(parent, field_name)
                if value is not None:
                    new_value = self._copy_field_value(field, value)
                    setattr(self, field_name, new_value)

        self._need_reinst = False

    def instantiate(self, **kw):
        assert 'parent' not in kw, 'Parameter "parent" is not valid to instantiate: {!r}'.format(self)
        return type(self)(parent=self, **kw)

    #@warn_calling(skip=(r'site-packages',))
    def __iter__(self):
        return super(Node, self).__iter__()

    def node_hash(self):  # todo: (!) rename to proto_uri
        #u'''uri первого попавшегося абстрактного узла в цепочке наследования включющей данный узел'''
        uri = self.uri
        if uri:
            return uri

        parent = self.parent
        assert parent, 'Try to get a node hash of wrong node: {!r}'.format(self)
        return self.parent.node_hash()

    def node_html(self):  # todo: rename
        return self.node_hash().replace('://', '-').replace('/', '-')

    def get(self, addr, *defaults):
        if len(defaults) > 1:
            raise TypeError('get expected at most 3 arguments, got {}'.format(2 + len(defaults)))

        path = addr2path(addr)
        if not path:
            return self

        key, rest = path[0], path[1:]
        subnodes = self.subnodes or {}
        subnode = subnodes.get(key)
        if subnode is not None:
            return subnode.get(rest, *defaults)

        if defaults:
            return defaults[0]

        raise RegistryNodeIsNotFound('Node {!r} has no subnode {}'.format(self, path))

    def deep_iter(self, reject_abstract=True):
        queue = [self]
        while queue:
            item = queue.pop()
            queue.extend(item.subnodes.values())
            if not item.abstract or not reject_abstract:
                yield item

    def __str__(self):
        return self.to_string()

    def __repr__(self):
        uri = self_uri = self.uri
        if not uri:
            parent = self.parent
            uri = parent and parent.uri

        return '<{self.__class__.__name__}({mark}{uri})>'.format(self=self, uri=uri, mark='' if self_uri else '*')

    @property
    def tag_set(self):
        tags = set(self.tags or [])
        if self.parent:
            tags.update(self.parent.tag_set)
        return tags

    def as_client_dict(self):  # todo: rename to 'to_son_client'
        d = super(Node, self).as_client_dict()
        d.update(
            node_hash=self.node_hash(),  # todo: REALIZE and uncomment this
            html_hash=self.node_html(),
            tags=list(self.tag_set),
        )
        return d

    def is_ancestor(self, parent_candidate):
        return self.get_ancestor_level(parent_candidate) >= 0

    def get_ancestor_level(self, parent_candidate):
        h = parent_candidate.node_hash()
        i = 0
        obj = self
        while obj and obj.node_hash() != h:
            i += 1
            obj = obj.parent

        return i if obj else -1

    def __setattr__(self, key, value):
        # todo: ##OPTIMIZE
        if key not in {'_empty_overrided_fields', '_initialised'} and key in type(self)._inheritable_fields:
            _empty_overrided_fields = self._empty_overrided_fields
            if _empty_overrided_fields is None:
                self._empty_overrided_fields = []
                _empty_overrided_fields = self._empty_overrided_fields
            _is_in = key in _empty_overrided_fields
            _is_value = value is not None
            if not _is_value and not _is_in:
                _empty_overrided_fields.append(key)
            elif _is_value and _is_in:
                _empty_overrided_fields.remove(key)

        super(Node, self).__setattr__(key, value)

    def __delattr__(self, item):
        # todo: ##OPTIMIZE
        super(Node, self).__delattr__(item)
        _empty_overrided_fields = self._empty_overrided_fields
        _data = self._data
        if item in _empty_overrided_fields:
            _empty_overrided_fields.remove(item)
        if item in _data:
            _data.pop(item)


########################################################################################################################

def addr2path(addr):
    if isinstance(addr, URI):
        return addr.path

    if isinstance(addr, tuple):
        return addr

    if isinstance(addr, basestring):
        if "\\" in addr and '/' not in addr:
            log.warning('URI in non-standard format: %r', addr)
            addr = addr.replace('\\', '/')

        if addr.startswith('reg://') or addr.startswith('/'):
            uri = URI(addr)
            assert not uri.params and not uri.anchor, 'Wrong node address to get: {!r}'.format(addr)
            return uri.path
        else:
            return tuple(addr.split('/'))

    return tuple(addr)


class Registry(Document):
    meta = dict(
        collection='reg',
        queryset_class=QuerySetNoDeRef,  # todo: disable dereference
    )

    name = StringField()
    root = EmbeddedNodeField()

    def __init__(self, **kw):
        super(Registry, self).__init__(**kw)
        self._cache = {}
        self.loading = None

    @warn_calling()
    def __nonzero__(self):
        return True

    # todo: del mentions "_put"

    def get(self, uri, *defaults):
        """
        :param uri: Registry node URI
        :type uri: URI|basestring
        :param defaults:
        :return: Node or default if specified
        :rtype: Node|None
        """
        path = addr2path(uri)
        if not path:
            return self.root

        result = self._cache.get(path)
        if result is not None:
            return result

        root_name, rest_path = path[0], path[1:]
        if self.root.name == root_name:
            result = self.root.get(rest_path, *defaults)
            self._cache[path] = result
            return result

        if defaults:
            return defaults[0]

        raise RegistryNodeIsNotFound('Registry has no root named {!r}'.format(self, root_name))

    def make_node_by_uri(self, uri, **kw):
        uri = URI.ensure(uri)
        parent = self.get(uri)
        return parent.instantiate(_uri=uri, **kw)

    def load(self, path, validate=False):
        """
        Load registry tree from file system.
        :param path: Path to registry structure in file system
        :type path: str
        :return: self
        :rtype: Registry
        """
        self.loading = 'preloading'
        path = os.path.join(path, 'registry')
        log.debug('Registry FS loading start from: %r', path)
        all_nodes = []
        stack = deque([(path, None)])
        with Timer(logger=None) as timer:
            while stack:
                pth, owner = stack.pop()
                node = self._load_node_from_fs(pth, owner)
                if node is not None:
                    if owner is None:
                        self.root = node
                        # log.debug('Setup root: {!r}'.format(node))
                    all_nodes.append(node)
                    for f in os.listdir(pth):
                        next_path = os.path.join(pth, f)
                        if os.path.isdir(next_path) and not f.startswith('#'):  # and not f.startswith('_'):
                            stack.append((next_path, node))

            log.debug('    structure loaded {} nodes ({:.3f}s)'.format(len(all_nodes), timer.duration))

            self.loading = 'expanding'
            # todo: multiple expanding of one node ##optimize
            with Timer() as timer1:
                self.root.expand_links()

            log.debug('    nodes expanded ({:.3f}s)'.format(timer1.duration))

            self.loading = False
            if validate:
                with Timer() as timer2:
                    for node in all_nodes:
                        try:
                            node.validate()
                        except ValidationError as err:
                            log.error(err)
                            for k, error in err.errors.items():
                                log.error('    {}:: {}'.format(k, error))
                                # todo: log messages format
                log.debug('    validated ({:.3f}s).'.format(timer2.duration))

        log.info('Registry FS loading DONE: {} nodes from {!r} ({:.3f}s).'.format(len(all_nodes), path, timer.duration))
        return self

    def _load_node_from_fs(self, path, owner=None):
        """
        :param path: basestring
        :param owner: Node|None
        :return: Node
        """
        assert isinstance(path, unicode), '_load_node_from_fs: path is not unicode, but: {!r}'.format(path)
        attrs = {}
        if not os.path.isdir(path):
            raise RegistryError('Registry structure is not found by path {!r}'.format(path))
        for f in sorted(os.listdir(path)):
            assert isinstance(f, unicode), 'listdir returns non unicode value: {!r}'.format(f)
            # f = f.decode(sys.getfilesystemencoding())
            p = os.path.join(path, f)
            # todo: need to centralization of filtering
            if not f.startswith('_') and not f.startswith('#') and os.path.isfile(p) and fnmatch(p, '*.yaml'):
                with open(p) as attr_file:
                    try:
                        d = yaml_tools.load(attr_file) or {}
                    except yaml_tools.YAMLError as e:
                        raise RegistryNodeFormatError(e)
                    assert isinstance(d, dict), 'Yaml content is not object, but: {!r}'.format(d)
                    attrs.update(d.items())

        attrs.update(owner=owner)
        attrs.setdefault('filename', path)
        attrs.setdefault('name', os.path.basename(path.strip('\/')))
        attrs.setdefault('parent', owner)
        attrs.setdefault('abstract', True)  # todo: Вынести это умолчание на видное место
        attrs.setdefault('uri', '{}/{}'.format('reg://' if owner is None else owner.uri, attrs['name']))

        class_name = attrs.get('_cls')

        if not class_name:  # TODO: remove deprecated '__cls__' attribute support
            class_name = attrs.pop('__cls__', None)
            if class_name:
                attrs['_cls'] = class_name

        if not class_name:
            parent = attrs.get('parent', None)
            if parent is not None:
                parent_node = self.get(parent, None) if isinstance(parent, basestring) else parent

                if parent_node is None:
                    log.warning(
                        "Parent node {parent!r} of {path!r} is not found (not loaded yet?). "
                        "Can't detect node class to load.".format(**locals())
                    )
                else:
                    class_name = attrs.setdefault('_cls', parent_node._cls)

        cls = get_document(class_name or Node._class_name)
        node = cls(__auto_convert=False, _created=False, **attrs)

        if owner is not None:
            if isinstance(owner, Node):
                owner.subnodes[node.name] = node
            # todo: assert: owner is document
            node._instance = owner
        return node

    def save_to_file(self, f, **kw):
        yaml_tools.save_to_file(self.to_mongo().to_dict(), f, **kw)

    @classmethod
    def load_from_file(cls, src):
        def _load(stream):
            #return cls.from_json(stream.read(), created=True)
            return cls._from_son(yaml_tools.load(stream))

        # TODO: Убедиться, что внутренние ноды вновь загруженного реестра оперируют своей копией реестра, а не синглтоном
        if isinstance(src, basestring):
            with codecs.open(src, encoding='utf-8') as src_stream:
                return _load(src_stream)
        elif hasattr(src, 'read'):
            return _load(src)
        else:
            raise ValueError("Registry download source is not filename or stream: {!r}".format(src))


class Root(Node):
    pass


REGISTRY = None


def _deep_import(path, reg_name='registry'):
    from importlib import import_module
    apath = os.path.normpath(os.path.abspath(path))

    if apath not in sys.path:
        sys.path.append(apath)

    root_depth = len(apath.split(os.path.sep))
    imp_list = []
    for r, d, f in os.walk(os.path.join(apath, reg_name)):
        if '__init__.py' in f:
            r = os.path.normpath(r)
            rr = tuple(r.split(os.path.sep)[root_depth:])
            imp_list.append(rr)

    imp_list.sort()
    for module in imp_list:
        module_str = '.'.join(module)
        try:
            import_module(module_str)
        except ImportError as e:
            log.exception("Can't import {module_str}: {e}".format(**locals()))
            raise e


def get_global_registry(path, reload=False, save_loaded=True):
    """
    :param path: Path to registry structure in filesystem
    :type: basestring
    :param reload: Reload registry required
    :type reload: bool
    :param save_loaded: Save registry to DB after loading
    :type save_loaded: bool
    :return: Registry tree
    :rtype: Registry
    """
    global REGISTRY
    if reload:
        REGISTRY = None

    if REGISTRY is None:
        with Timer() as t:
            _deep_import(path, reg_name='registry')
            log.debug('Registry instant classes import DONE ({:.3f}s)'.format(t.duration))

    if REGISTRY is None and not reload:
        with Timer(logger=None) as t:
            REGISTRY = Registry.objects.first()
            log.debug('Registry {}fetched from DB ({:.3f}s)'.format('is NOT ' if REGISTRY is None else '', t.duration))

    if REGISTRY is None:
        if save_loaded:
            with Timer(logger=None) as t:
                Registry.objects.all().delete()
                log.debug('Registry DB cleaned ({:.3f}s).'.format(t.duration))

        REGISTRY = Registry()
        REGISTRY.load(path)
        if save_loaded:
            with Timer(logger=None) as t:
                REGISTRY.save()
                log.debug('Registry saved to DB ({:.3f}s).'.format(t.duration))

    return REGISTRY


def patch_field_getter(field_class):
    field_class.__get__ = field_getter_decorator(field_class.__get__)


def _patch_all_fields_to_inheritance_support():
    u"""
    Патчит все типы полей, импортированные в этом модуле
    для эффективной поддержки наследования в нодах реестра
    """
    for k, v in globals().items():
        if isinstance(v, type) and issubclass(v, BaseField):
            patch_field_getter(v)


map(patch_field_getter, [
    #BaseField,
    BooleanField,
    IntField,
    FloatField,
    StringField,
    UUIDField,
    DateTimeField,
    ListField,
    DictField,
    MapField,
    EmbeddedDocumentField,
])
#_patch_all_fields_to_inheritance_support()
########################################################################################################################
########################################################################################################################
class STAT(object):
    expand_by_uri = Counter()
    expand_counter = Counter()
    expand_legend = {}

    def expand(self, node):
        uri = getattr(node, 'uri', '--')
        _id = id(node)
        self.expand_legend[_id] = node
        self.expand_by_uri[uri] += 1
        res = self.expand_counter[_id]
        self.expand_counter[_id] += 1
        return res

    @property
    def top_uri(self):
        from operator import itemgetter
        return sorted(self.expand_by_uri.items(), key=itemgetter(1), reverse=True)[:20]

    @property
    def top_id(self):
        from operator import itemgetter
        return sorted(self.expand_counter.items(), key=itemgetter(1), reverse=True)[:20]

    @property
    def s(self):
        return '\n'.join([
            'Top by URI: ' + repr(self.top_uri),
            'Top by ID : ' + repr(self.top_id),
        ])

STAT = STAT()
# todo: Сделать юнит-тестирование системы реестров (загрузка, сохранение, восстановление)
# todo: Проверить кэширование RegistryLinkField
# todo: Реализовать кэширование унаследованных атрибутов
#       - кэшировать в отдельном несериализуемом словаре
#       - проверить возможность перекрытия __getattribute__ на уровне узла вместо подмешивания ко всем типам полей
# todo: Реализовать кэширование root_instance