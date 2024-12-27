

import re
import os
import sys
import fnmatch
import collections


RE_URL = re.compile(r"url\('([^']*)'\)")


def search_in_file(src='.', mask='*.css', recursive=True):
    if not isinstance(mask, collections.Callable):
        if mask is None:
            masks = []
        elif isinstance(mask, basestring):
            masks = [mask]
            
        mask = lambda fn: any((fnmatch.fnmatch(fn, m) for m in masks))
        
    if hasattr(src, 'read'):
        #print('fobj', src)
        data = src.read()
        return RE_URL.findall(data)
    elif os.path.isfile(src) and mask(src):
        #print('filename', src)
        with open(src) as f:
            data = f.read()
        return RE_URL.findall(data)
    elif os.path.isdir(src) and recursive:
        #print('dir', src)
        result = []
        for fn in os.listdir(src):
            result.extend(search_in_file(os.path.join(src, fn), mask, recursive) or [])
        return result


if __name__ == '__main__':
        
    for m in search_in_file(*sys.argv[1:]):
        print(m)

