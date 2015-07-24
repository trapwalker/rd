# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)


class Attribute(object):
    def __init__(self, default=None, doc=None, caption=None):
        # todo: add param: null
        self.name = None
        self.cls = None
        self.default = default
        self.doc = doc
        self.caption = caption

    @property
    def title(self):
        assert self.name, 'Attribute is not attached'
        return self.caption or self.name

    def __str__(self):
        return '{self.__class__.__name__}(name={self.name}, cls={self.cls})'.format(self=self)

    def __get__(self, obj, cls):
        value = obj._get_attr_value(self.name, self.default)  # todo: cascade getter (!)
        log.debug('__get__ %s.%s() => %s', obj, self.name, value)
        return value

    def __set__(self, obj, value):
        log.debug('__set__ %s.%s = %s', obj, self.name, value)
        obj._set_attr_value(self.name, value)

    def __delete__(self, obj):
        log.debug('__gelete__ %s.%s() => %s', obj, self.name)
        obj._del_attr_value(self.name)

    def attach(self, name, cls):
        self.name = name
        self.cls = cls
        # todo: global attribute registration


# todo: reserved attr names checking


class DocAttribute(Attribute):
    def __init__(self):
        super(DocAttribute, self).__init__(caption=u'Описание', doc=u'Описание узла')

    def __get__(self, obj, cls):
        default = cls.__doc__
        value = obj._get_attr_value(self.name, self.default or default)  # todo: cascade getter
        return value


class RegistryLink(Attribute):
    def __get__(self, obj, cls):
        pass  # todo: realization
        #value = obj._get_attr_value(self.name, self.default)
        #return value
