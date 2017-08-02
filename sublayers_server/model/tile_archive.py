# -*- coding: utf-8 -*-
from __future__ import absolute_import

import logging
log = logging.getLogger(__name__)


from sublayers_server.model.tileid2 import Tileid2

from tornado.httpclient import HTTPClient
import cStringIO
import os
import shutil

# http://sublayers.net/map/18/48876/106134.jpg
def get_tiles_admin(ax, ay, tile_name='merged'):

    if tile_name not in ['front', 'back', 'merged']:
        tile_name = 'merged'

    download_str = 'https://roaddogs.ru/map/{}/{}/{}/{}.png'.format

    start_tile = Tileid2(long(ax), long(ay), 26)
    http = HTTPClient()

    serv_dir = os.getcwd()
    try:
        os.chdir('static')
        shutil.rmtree('temp', ignore_errors=True)
        os.mkdir('temp')
        os.chdir('temp')
        temp_dir = os.getcwd()

        try:
            for zoom in range(15, 19):
                os.chdir(temp_dir)
                # получить все файлы заданного зума
                px, py, pz = start_tile.parent_by_lvl(level=zoom).xyz()
                os.mkdir(str(zoom))
                os.chdir(str(zoom))
                for x in range(px-2, px+3):
                    # создать папки X
                    os.mkdir(str(x))
                    for y in range(py-2, py+3):
                        img_source = http.fetch(request=download_str(tile_name, zoom, x, y), method="GET").body
                        file_like = cStringIO.StringIO(img_source)
                        with open(os.path.join(os.path.join(os.path.join(temp_dir, str(zoom)), str(x)), '{}.jpg'.format(y)), 'wb') as fdest:
                            shutil.copyfileobj(file_like, fdest)
        except Exception as e:
            log.info('Tile Archive Error: {}  {}: {}'.format(tile_name, ax, ay))
            log.info(e)

        os.chdir(serv_dir)
        os.chdir('../sublayers_common/static')
        shutil.make_archive('temp_archive', 'zip', temp_dir)
    finally:
        os.chdir(serv_dir)
    log.debug('Zip_Archive complete !')





