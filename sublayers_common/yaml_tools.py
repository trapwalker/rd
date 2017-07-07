# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from yaml import load, YAMLError, Dumper
import yaml.representer


class CompactDumper(Dumper):
    pass


def represent_str(self, data):
    tag = None
    style = None
    try:
        data = unicode(data, 'ascii')
        tag = u'tag:yaml.org,2002:str'
        style = '|' if '\n' in data else None
    except UnicodeDecodeError:
        try:
            data = unicode(data, 'utf-8')
            tag = u'tag:yaml.org,2002:str'
            style = '|' if '\n' in data else None
        except UnicodeDecodeError:
            data = data.encode('base64')
            tag = u'tag:yaml.org,2002:binary'
            style = '|' if len(data) > 64 or '\n' in data else None
    return self.represent_scalar(tag, data, style=style)


def represent_unicode(self, data):
    style = '|' if '\n' in data else None
    return self.represent_scalar(u'tag:yaml.org,2002:str', data, style=style)


CompactDumper.add_representer(str, represent_str)
CompactDumper.add_representer(unicode, represent_unicode)


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

    if isinstance(f, basestring):
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
        ub=u''.join(map(chr, range(40))),
        s1='''str one line''',
        s2='''str\nmulti\nline''',
        u1='''unicode on1 line''',
        u2=u'''unicode\nmulti\nline''',
    )
    print d
    print dump(d, indent=2)