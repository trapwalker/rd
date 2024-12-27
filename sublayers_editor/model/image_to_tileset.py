# -*- coding: utf-8 -*-

#from PIL import Image, ImageDraw #Подключим необходимые библиотеки.
from tileset import Tileset
from tileid import Tileid
from tileid2 import Tileid2
from pymongo import Connection



#TODO: Если выбранный файл (тайл) полностью одного цвета - учесть это специальным вызовом ts.set_tile

def ImageToTileset(directory, zoom, x_start=0, y_start=0, x_finish=None, y_finish=None, color=(0, 0, 0)):
    u''' Получает на вход:
    directory - директория с тайлами,
    zoom - уровень зума тайлов,
    x_start, y_start - стартовые координаты x,y для тайлсета
    x_finish, y_finish - финальные координаты для тайлсета
    color - цвет для фильтрации, именно этим цветом раскрасится Tileset
    возвращает раскрашенный Tileset
    '''

    if y_finish is None:
        y_finish = int(2 ** zoom)
    if x_finish is None:
        x_finish = int(2 ** zoom)
    # проход по всем тайлам, возвращает (имя тайла, координаты x, y на заданном зуме)
    def tile_file(zoom):
        for xx in xrange(x_start, x_finish):
            for yy in xrange(y_start, y_finish):
                # TODO: поменять format(zoom, yy, xx) на format(zoom, xx, yy)
                yield (directory + r'/{}/{}/{}.png'.format(zoom, xx, yy), xx, yy)

    def is_color(pxl):
        # todo: возможно сделать нестрогое сравнение через rgb: r, g, b = pxl
        # print(pxl)
        #return pxl == color
        r, g, b, a = pxl
        return r < 150 and g < 150 and b < 150




    ts = Tileset()

    for fn in tile_file(zoom):
        print(fn)
        im = Image.open(fn[0])
        pxs = im.load()
        width, height = im.size
        for x in xrange(width):
            for y in xrange(height):
                if is_color(pxs[x, y]):
                    ts.set_tile(Tileid(fn[1] * 256 + x, fn[2] * 256 + y, zoom + 8))
    return ts


def TilesetToImage(tileset, file_name, fillcolor=None, pencolor=None):
    max_lvl = tileset.level
    image = Image.new("RGB", (2 ** max_lvl, 2 ** max_lvl), (255, 255, 255))
    draw = ImageDraw.Draw(image)  # Создаем инструмент для рисования.
    for leaf in tileset.iter_leafs():
        tile = leaf[0]
        if leaf[1] == 1:
            x, y, z = tile.xyz()
            if z == max_lvl:
                draw.point((x, y), pencolor)
            else:
                mul = 2 ** (max_lvl - z)
                minpoint = (x * mul, y * mul)
                maxpoint = ((x + 1) * mul, (y + 1) * mul)
                draw.rectangle([minpoint, maxpoint], fill=fillcolor, outline=pencolor)

        if leaf[1] == 0:
            x, y, z = tile.xyz()
            if z == max_lvl:
                draw.point((x, y), (255, 255, 255))
            else:
                mul = 2 ** (max_lvl - z)
                minpoint = (x * mul, y * mul)
                maxpoint = ((x + 1) * mul, (y + 1) * mul)
                draw.rectangle([minpoint, maxpoint], fill=(255, 255, 255), outline=pencolor)
    image.save(file_name, "BMP")
    del draw


def TilesetToMongoDB(tileset, collection, color, ts_name):
    u"""
    color: для отрисовки в эдиторе. Используется:
        #555555 - дороги
        #00FF00 - леса
        #0000FF - вода
    """

    count = 0
    for leaf in tileset.iter_leafs():
        if leaf[1] == 1:
            x, y, z = leaf[0].xyz()
            obj = {u'tileid': Tileid2(long(x), long(y), long(z)),
                   u'color': color,
                   u'ts_name': ts_name
            }
            collection.insert(obj)
            count +=1

    return count


def MongoDBToTileset(collection, ts_name):
    ts = Tileset()
    for obj in collection.find({u'ts_name': ts_name}):
        x, y, z = Tileid2(obj[u'tileid']).xyz()
        ts.set_tile(Tileid(x, y, z))
    return ts


def MongoDBToTilesets(collection):
    tss = {}
    for obj in collection.find():
        if not tss.has_key(obj[u'ts_name']):
            tss[obj[u'ts_name']] = Tileset()
        x, y, z = Tileid2(obj[u'tileid']).xyz()
        tss[obj[u'ts_name']].set_tile(Tileid(x, y, z))
    return tss


if __name__ == '__main__':
    '''
    ts = ImageToTileset(directory=r'C:/_tiles/scrub', zoom=12,
                        x_start=759, y_start=1645, x_finish=767, y_finish=1653,
                        color=(0, 0, 0))
    #ts = Tileset(open('d:/ts_wood_11'))
    print(ts.level)
    ts.save(open('d:/ts_scrub_12', 'w'))
    #TilesetToImage(ts, r"d:/temp_image3.bmp", fillcolor=(150, 150, 150), pencolor=(0, 0, 0))
    '''
    db_connection = Connection()
    db = db_connection.maindb
    ts = Tileset(open('d:/tiles/ts_road_15'))
    print(TilesetToMongoDB(ts, db.tile_sets, '#555555', 'road'))
    # ts = Tileset(open('d:/ts_water_12'))
    # print(TilesetToMongoDB(ts, db.tile_sets, '#0000FF', 'water'))
    # ts = Tileset(open('d:/ts_wood_12'))
    # print(TilesetToMongoDB(ts, db.tile_sets, '#00FF00', 'wood'))