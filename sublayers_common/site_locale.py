# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from os import walk
from os.path import join
import yaml
import json
import codecs

from sublayers_server.model.registry_me.localization import LocalizedString


locale_objects = dict()


def load_locale_objects(path):
    global locale_objects
    mypath = join(path, 'yaml')

    for r, d, files in walk(mypath):
        for f in files:
            if f.endswith('.yaml'):
                fn = join(r, f)
                with open(fn) as data_file:
                    data = yaml.load(data_file)
                    locale = data.get('locale', None)
                    if locale:
                        locale_objects.setdefault(locale, {}).update(data)
                    else:
                        log.warning('Not define locale in file: {}'.format(fn))

    for locale, locale_object in locale_objects.items():
        with codecs.open(join(mypath, locale, '.compiled.js'), 'w', encoding='utf-8') as f:
            f.write(u'locale_object = {};'.format(json.dumps(locale_object, ensure_ascii=False)))


def locale(lang, key):
    if isinstance(key, LocalizedString) or isinstance(key, dict):
        return key.get(lang, '##LANG NOT SUPPORTED##')

    locale_lang = locale_objects.get(lang, None)
    return locale_lang and locale_lang.get(key, key) or key
