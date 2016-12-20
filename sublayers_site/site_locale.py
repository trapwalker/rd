# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from os import listdir
from os.path import isfile, join
import yaml


locale_objects = dict()


def load_locale_objects():
    mypath = '../sublayers_common/static/locale/yaml/'
    for file_name in [join(mypath, f) for f in listdir(mypath) if f.endswith('.yaml')]:
        if isfile(file_name):
            with open(file_name) as data_file:
                data = yaml.load(data_file)
                if data.get('locale', None):
                    locale_objects[data['locale']] = data
                else:
                    log.warning('Not define locale in file: {}'.format(file_name))

def locale(lang, key):
    locale_lang = locale_objects.get(lang, None)
    return locale_lang and locale_lang.get(key, key) or key
