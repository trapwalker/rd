# -*- coding: utf-8 -*-

import os
import sys

RES_FOLDER_PATH = u'resources.bin'

class PathError(Exception):
    pass


def iter4links(root=RES_FOLDER_PATH):
    for src, dirs, files in os.walk(root):
        if not dirs:
            dest = src.replace(root, u'').lstrip(os.path.sep)
            if not os.path.basename(dest).startswith(u'.'):
                yield src, dest


def mkpath(path):
    path = os.path.normpath(path)
    if path == u'.':
        return 
    items = path.split(os.path.sep)
    for i in range(1, len(items) + 1):
        p = os.path.join(*items[:i])
        if not os.path.exists(p):
            print(u'MAKE', p)
            try:
                os.mkdir(p)
            except Exception as e:
                raise PathError(u'''Can't create directory "{}": {}'''.format(p, repr(e)))
        elif not os.path.isdir(p):
            raise PathError(u'Path "{}" already exists and this is not a directory.'.format(p))


def make_links(root=RES_FOLDER_PATH):
    for src, dest in iter4links():
        path = os.path.dirname(dest)
        mkpath(path)
        try:
            symlink(os.path.abspath(src), dest)
        except Exception as e:
            print(u']tFAIL:')
            print(repr(e))


def symlink_os(source, link_name):
    cmd = u'mklink /D "{}" "{}"'.format(link_name, source)
    print('>', cmd)
    err = os.popen3(cmd)[2].read().decode('cp866')
    if err:
        print('FAIL:', err, file=sys.stderr)


def symlink(source, link_name):
    import os
    os_symlink = getattr(os, "symlink", None)
    if callable(os_symlink):
        os_symlink(source, link_name)
    else:
        import ctypes
        csl = ctypes.windll.kernel32.CreateSymbolicLinkW
        csl.argtypes = (ctypes.c_wchar_p, ctypes.c_wchar_p, ctypes.c_uint32)
        csl.restype = ctypes.c_ubyte
        flags = 1 if os.path.isdir(source) else 0
        if csl(link_name, source, flags) == 0:
            raise ctypes.WinError()

if __name__ == '__main__':
    make_links()
