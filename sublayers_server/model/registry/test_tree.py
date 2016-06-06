# -*- coding: utf-8 -*-
import sys
import logging
log = logging.getLogger(__name__)

if __name__ == '__main__':
    log = logging.getLogger()
    sys.path.append('../../..')
    log.level = logging.DEBUG
    log.addHandler(logging.StreamHandler(sys.stderr))

from sublayers_server.model.registry import classes  # Не удалять этот импорт! Авторегистрация классов.
from sublayers_server.model.registry.tree import Node
from sublayers_server.model.registry.uri import URI


if __name__ == '__main__':
    pass