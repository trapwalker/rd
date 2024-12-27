# -*- coding: utf-8 -*-

from PIL import Image, ImageDraw #Подключим необходимые библиотеки.
from tileset import Tileset
from tileid import Tileid
from tileid2 import Tileid2


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

        # r, g, b = pxl
        # return r < 150 #  and g < 150 and b < 150

        r, g, b, a = pxl
        return a != 0

    ts = Tileset()

    all_tiles = (x_finish - x_start) * (y_finish - y_start)
    last_prc = 0
    count = 0

    for fn in tile_file(zoom):
        # print(fn)
        count += 1
        current_prc = int(100 * count / all_tiles)
        if current_prc != last_prc:
            last_prc = current_prc
            print('{} %'.format(last_prc))

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
    print('start zone 1')
    ts = ImageToTileset(directory=r'd:/tiles/map_zones/roads', zoom=15,
                        x_start=6021, y_start=13165, x_finish=6184, y_finish=13330,
                        color=(0, 0, 0))
    print(ts.level)
    ts.save(open('d:/tiles/ts_road_z15_06-17', 'w'))


    print('start zone 2')
    ts2 = ImageToTileset(directory=r'd:/tiles/map_zones/forest', zoom=15,
                        x_start=6021, y_start=13165, x_finish=6184, y_finish=13330,
                        color=(0, 0, 0))
    print(ts2.level)
    ts2.save(open('d:/tiles/ts_forest_z15_06-17', 'w'))


    print('start zone 3')
    ts3 = ImageToTileset(directory=r'd:/tiles/map_zones/water', zoom=15,
                        x_start=6021, y_start=13165, x_finish=6184, y_finish=13330,
                        color=(0, 0, 0))
    print(ts3.level)
    ts3.save(open('d:/tiles/ts_water_z15_06-17', 'w'))
