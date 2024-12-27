# -*- coding: utf-8 -*-
from __future__ import absolute_import

import sys

if __name__ == '__main__':
    from logging import getLogger, StreamHandler
    log = getLogger()
    log.setLevel('DEBUG')
    log.addHandler(StreamHandler(sys.stderr))

    sys.path.append('..')


from sublayers_common import site_locale


if __name__ == '__main__':
    print('start')
    site_locale.load_locale_objects('../sublayers_common/static/locale/game', '../sublayers_world')
    print('end')


