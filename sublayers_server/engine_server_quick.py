#!/usr/bin/env python
# -*- coding: utf-8 -*-
from __future__ import absolute_import

import sys
import os


def parent_folder(fn):
    return os.path.abspath(os.path.join(os.path.dirname(fn), '..'))


sys.path.append(parent_folder(__file__))


if __name__ == '__main__':
    import log_setup
    log_setup.init(quick_mode=True)


from sublayers_server.engine_server import main


if __name__ == "__main__":
    main()
