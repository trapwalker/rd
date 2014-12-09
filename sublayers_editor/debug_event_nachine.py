#!/usr/bin/env python

import logging.config
logging.config.fileConfig("logging.conf")
log = logging.getLogger(__name__)

from model.editor_server import main

if __name__ == "__main__":
    globals().update(main())
