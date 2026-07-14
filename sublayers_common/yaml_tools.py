# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from yaml import YAMLError, Dumper, FullLoader
import yaml.representer


def load(stream, Loader=FullLoader):
    # PyYAML>=6 требует явного указания Loader
    return yaml.load(stream, Loader=Loader)


class CompactDumper(Dumper):
    pass


def represent_str(self, data):
    style = '|' if '\n' in data else None
    return self.represent_scalar('tag:yaml.org,2002:str', data, style=style)


CompactDumper.add_representer(str, represent_str)


def dump(data, stream=None, Dumper=CompactDumper, allow_unicode=True, encoding='utf-8', **kw):
    return yaml.dump(data, stream=stream, Dumper=Dumper, allow_unicode=allow_unicode, encoding=encoding, **kw)


def save_to_file(data, f, indent=2, format='yaml'):
    def _save(s):
        #s.write(self.to_json(ensure_ascii=ensure_ascii, indent=indent, **kw).encode('utf-8'))
        if format in {'yaml', 'y', 'YAML', 'Y', 'Yaml'}:
            dump(data, s, indent=indent)
        elif format in {'json', 'j', 'JSON', 'J', 'Json'}:
            from bson import json_util
            s.write(json_util.dumps(data, ensure_ascii=False, indent=indent).encode('utf-8'))

    if isinstance(f, str):
        with open(f, 'w') as stream:
            _save(stream)
    elif hasattr(f, 'write'):
        _save(f)
    else:
        raise ValueError("Destination to save is not filename or stream: {!r}".format(f))



########################################################################################################################
if __name__ == '__main__':
    d = dict(
        sb=''.join(map(chr, range(40))),
        ub=''.join(map(chr, range(40))),
        s1='''str one line''',
        s2='''str\nmulti\nline''',
        u1='''unicode on1 line''',
        u2='''unicode\nmulti\nline''',
    )
    print(d)
    print(dump(d, indent=2))