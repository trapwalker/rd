# -*- coding: utf-8 -*-
from __future__ import absolute_import, print_function
import os
import sys
import logging
log = logging.getLogger(__name__)

from mongoengine import EmbeddedDocument, EmbeddedDocumentField, StringField, MapField


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


class LocalizedStringField(EmbeddedDocumentField):
    def __init__(self, document_type=LocalizedString(), default=LocalizedString, **kwargs):
        super(LocalizedStringField, self).__init__(document_type=document_type, default=default, **kwargs)

    def to_python(self, value):
        if isinstance(value, basestring):
            return LocalizedString(text=value)

        if not isinstance(value, self.document_type):
            return self.document_type._from_son(value, _auto_dereference=self._auto_dereference)
        return value
