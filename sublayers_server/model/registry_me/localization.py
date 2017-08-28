# -*- coding: utf-8 -*-
from __future__ import absolute_import, print_function
import os
import sys
import logging
log = logging.getLogger(__name__)

from mongoengine import EmbeddedDocument, EmbeddedDocumentField, StringField


DEFAULT_LANG = 'en'


class LocalizedString(EmbeddedDocument):
    en = StringField()
    ru = StringField()

    def __init__(self, text=None, *args, **kwargs):
        if text:
            kwargs.setdefault('en', text)
            kwargs.setdefault('ru', text)
        super(LocalizedString, self).__init__(*args, **kwargs)

    def __unicode__(self):
        return getattr(self, DEFAULT_LANG)

    def as_dict(self):
        # todo: ##REFACTORING
        return dict(en=self.en, ru=self.ru)

    def get(self, lang, *default):
        try:
            if lang in self._fields_ordered:
                return getattr(self, lang)
        except AttributeError:
            pass

        log.warning('The language %r is not supported', lang)
        if default:
            return default[0]
        raise KeyError('The language %r is not supported' % lang)

    def __getitem__(self, name):
        return self.get(name, getattr(self, DEFAULT_LANG))


class LocalizedStringField(EmbeddedDocumentField):
    def __init__(self, document_type=LocalizedString, default=LocalizedString, **kwargs):
        super(LocalizedStringField, self).__init__(document_type=document_type, default=default, **kwargs)

    def to_python(self, value):
        if isinstance(value, basestring):
            return LocalizedString(text=value)

        if not isinstance(value, self.document_type):
            return self.document_type._from_son(value, _auto_dereference=self._auto_dereference)
        return value
