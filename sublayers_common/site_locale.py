# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from os import listdir, walk
from os.path import isfile, join
import yaml


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


def locale(lang, key):
    locale_lang = locale_objects.get(lang, None)
    return locale_lang and locale_lang.get(key, key) or key
