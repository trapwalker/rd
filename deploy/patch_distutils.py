

import sys
import os

CFG_PATH = 'Lib\distutils\distutils.cfg'

DATA = '''[build]
compiler=mingw32
'''


def patch():
    platform = sys.platform
    if 'win' not in platform.lower():
        print('Your platform {} is not patchable'.format(platform))
        return

    fn = os.path.join(sys.prefix, CFG_PATH)
    if os.path.isfile(fn):
        print('{} already exists. Not replaced.'.format(fn))
        return
    
    print('Create file {}'.format(fn))
    with open(fn, 'w') as f:
        f.write(DATA)

    print('DONE')


if __name__ == '__main__':
    patch()
