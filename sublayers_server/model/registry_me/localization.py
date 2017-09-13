# -*- coding: utf-8 -*-
from __future__ import absolute_import, print_function
import os
import sys
import logging
log = logging.getLogger(__name__)

from mongoengine import EmbeddedDocument, EmbeddedDocumentField, StringField
from tornado.template import Template

from sublayers_common.site_locale import locale, locales_by_key, locale_objects


DEFAULT_LANG = 'en'

class LocalizedString(EmbeddedDocument):
    _id = StringField(caption=u"Ключ из словаря локализации")
    # TODO: Реализовать отдельные типы полей для локализованных строк, чтобы они брали значение по instance.get
    en = StringField()
    ru = StringField()

    def __init__(self, text=None, _id=None, *args, **kwargs):
        if text:
            kwargs.setdefault('en', text)
            kwargs.setdefault('ru', text)

        if _id:
            supported_locales = locales_by_key.get(_id, ())
            for locale in supported_locales:
                kwargs.setdefault(locale, locale_objects[locale][_id])

        super(LocalizedString, self).__init__(*args, **kwargs)

    def __unicode__(self):
        res = getattr(self, DEFAULT_LANG)
        if res is not None:
            return res

        _id = self._id
        if _id:
            return unicode(_id)

        return u''


    def as_dict(self):
        # todo: ##REFACTORING
        return dict(en=self.en, ru=self.ru)

    @property
    def locales(self):
        return frozenset(['en', 'ru'])  # TODO: get supported locales automatically by registered fields

    def get(self, lang, *default):
        try:
            if lang in self._fields_ordered:
                return getattr(self, lang)
        except AttributeError:
            pass

        # TODO: Строки с идентификаторами могут быть локализованы уже после создания объекта.
        # Надо обеспечить поддержку такого перевода пост-фактум, чтобы при звятии локали приоритет был у ключа, а не сохранённых значений
        _id = self._id
        if _id:
            locale_object = locale_objects.get(lang, None)
            if locale_object is not None:
                translated_string = locale_object.get(_id)
                if translated_string is not None:
                    return translated_string
                log.warning('The key %r is not supported by locale %r', _id, lang)
            else:
                log.warning('Unsupported locale %r requested at string %r', lang, self)

        log.warning('The language %r is not supported', lang)
        if default:
            return default[0]
        raise KeyError('The language %r is not supported' % lang)

    def __getitem__(self, name):
        return self.get(name, getattr(self, DEFAULT_LANG))

    def generate(self, **kw):
        # TODO: ##OPTIMIZE
        d = {}
        for locale in self.locales:
            translated = self.get(locale, None)
            if translated is not None:
                try:
                    d[locale] = Template(translated, whitespace='oneline').generate(**kw)
                except Exception as e:
                    log.exception('Locale template rendering error: %r', e)

        return LocalizedString(**d)


class LocalizedStringField(EmbeddedDocumentField):
    def __init__(self, document_type=LocalizedString, default=LocalizedString, **kwargs):
        super(LocalizedStringField, self).__init__(document_type=document_type, default=default, **kwargs)

    def to_python(self, value):
        if isinstance(value, basestring):
            return LocalizedString(text=value)

        if not isinstance(value, self.document_type):
            return self.document_type._from_son(value, _auto_dereference=self._auto_dereference)
        return value
