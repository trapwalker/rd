

import logging
if __name__ == '__main__':
    logging.basicConfig(level=logging.DEBUG, format='%(asctime)s %(levelname)-7s %(message)s')
log = logging.getLogger(__name__)

import re
import os
import shutil
import urllib
import zipfile
import subprocess
try:
    from cStringIO import StringIO
except ImportError:
    from StringIO import StringIO


APP_ROOT = '..'
TEMP_FOLDER = os.path.join(APP_ROOT, 'temp')
WORLD_FOLDER = os.path.join(APP_ROOT, 'sublayers_world')
TILES_FOLDER = os.path.join(WORLD_FOLDER, 'tiles')
TILES_FN = 'tiles.zip'
TILES_IN_STORAGE_URL = 'http://example.com'


def setup():
    tmp_fp = os.path.join(TEMP_FOLDER, TILES_FN)
    if not os.path.isfile(tmp_fp):
        log.info('Downloading: Tiles...')
        subprocess.check_call(['wget', TILES_IN_STORAGE_URL, '-O', tmp_fp])
        log.info('Tiles archive downloading done: {} bytes'.format(getsize(tmp_fn)))        
    else:
        log.info('Tiles archive already exists: {} bytes'.format(getsize(tmp_fn)))

    assert os.path.isfile(tmp_fp), "Can't download tiles by link: {} to {}".format(TILES_IN_STORAGE_URL, tmp_fp)
            

    globals().update(locals())
    

if __name__ == '__main__':
    setup()
