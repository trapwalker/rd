# -*- coding: utf-8 -*-
from __future__ import absolute_import

import logging
log = logging.getLogger(__name__)

import sys
from os import walk
from os.path import join
import yaml
import json
import codecs
from fnmatch import fnmatch
from itertools import chain

from ctx_timer import Timer, T


locale_objects = dict()
locales_by_key = dict()


@T(logger=log)
def load_locale_objects(path, *other_paths):
    global locale_objects, locales_by_key
    mypath = join(path, 'yaml')
    paths = [mypath]
    paths.extend(other_paths)
    walks = chain(*map(walk, paths))

    with Timer() as tm:
        for r, d, files in walks:
            for f in files:
                if fnmatch(f, '*.lang.yaml'):
                    fn = join(r, f)
                    with open(fn) as data_file:
                        data = yaml.load(data_file)
                        locale = data.pop('locale', None)
                        _prefix = data.pop('__prefix', None)
                        if locale:
                            locale_lang_dict = locale_objects.setdefault(locale, {'locale': locale})
                            # Поиск конфликтов по ключам
                            old_keys = frozenset(locale_lang_dict.keys())
                            new_keys = frozenset(data.keys())
                            conflict_keys = old_keys & new_keys
                            if conflict_keys:
                                log.warning('Locale keys conflict in %r: %r', fn, list(conflict_keys))

                            locale_lang_dict.update(data)
                        else:
                            log.warning('Not define locale in file: %r', fn)

    log.debug('Localization files collect DONE ({:.2f}s)'.format(tm.duration))

    for locale, locale_object in locale_objects.items():
        # Сборка всех встреченных ключей с указанием перечня поддерживаемых локалей:
        for key in locale_object:
            locales_by_key.setdefault(key, set()).add(locale)

        # Сборка js-файлов локалей для клиента
        with codecs.open(join(mypath, locale, '.compiled.js'), 'w', encoding='utf-8') as f:
            f.write(u'locale_object = {};'.format(json.dumps(locale_object, ensure_ascii=False)))


def locale(lang, key):
    if isinstance(key, LocalizedString) or isinstance(key, dict):
        return key.get(lang, '##LANG NOT SUPPORTED##')

    locale_lang = locale_objects.get(lang, None)
    return locale_lang and locale_lang.get(key, key) or key


from sublayers_server.model.registry_me.localization import LocalizedString
