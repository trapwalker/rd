# -*- coding: utf-8 -*-
import sys
import logging
log = logging.getLogger(__name__)

from sublayers_server.model.registry import classes
from sublayers_server.model.registry.classes import Root


if __name__ == '__main__':
    log.level = logging.DEBUG
    log.addHandler(logging.StreamHandler(sys.stderr))

    import yaml




