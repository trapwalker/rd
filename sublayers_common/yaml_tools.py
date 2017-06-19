# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from yaml import load, YAMLError, Dumper
import yaml.representer


class CompactDumper(Dumper):
    pass


CompactDumper.add_representer(str, yaml.representer.SafeRepresenter.represent_str)
CompactDumper.add_representer(unicode, yaml.representer.SafeRepresenter.represent_unicode)


def dump(data, stream=None, Dumper=CompactDumper, allow_unicode=True, encoding='utf-8', **kw):
    return yaml.dump(data, stream=stream, Dumper=Dumper, allow_unicode=allow_unicode, encoding=encoding, **kw)
