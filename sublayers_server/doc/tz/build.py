
import markdown2
from glob import glob
import codecs
import os
import sys


def build(path='.', out=sys.stdout):
    mask = os.path.join(path, '*.md')
    for fn in glob(mask):
        with codecs.open(fn, mode='r', encoding='utf-8') as f:
            text = f.read()
            if ord(text[0]) == 0xfeff:
                text = text[1:]
            try:
                #print fn
                out.write(markdown2.markdown(text).encode('utf-8'))
                pass
            except UnicodeEncodeError as e:
                print 'Error in file {}: {}'.format(fn, e)

if __name__ == '__main__':
    with codecs.open('_tz.html', 'w') as f:
        print >>f, '<!DOCTYPE html><html lang="ru-RU"><head><meta charset="UTF-8" /></head>'
        build(out = f)
        print >>f, '</html>'
    
