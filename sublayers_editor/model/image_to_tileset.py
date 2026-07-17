# -*- coding: utf-8 -*-

#from PIL import Image, ImageDraw #Подключим необходимые библиотеки.
from sublayers_editor.model.tileset import Tileset
from sublayers_editor.model.tileid import Tileid
from sublayers_editor.model.tileid2 import Tileid2
from pymongo import MongoClient



#TODO: Если выбранный файл (тайл) полностью одного цвета - учесть это специальным вызовом ts.set_tile

def ImageToTileset(directory, zoom, x_start=0, y_start=0, x_finish=None, y_finish=None, color=(0, 0, 0)):
    ''' Получает на вход:
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
        for xx in range(x_start, x_finish):
            for yy in range(y_start, y_finish):
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
        for x in range(width):
            for y in range(height):
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
    """
    color: для отрисовки в эдиторе. Используется:
        #555555 - дороги
        #00FF00 - леса
        #0000FF - вода
    """

    count = 0
    for leaf in tileset.iter_leafs():
        if leaf[1] == 1:
            x, y, z = leaf[0].xyz()
            obj = {'tileid': Tileid2(int(x), int(y), int(z)),
                   'color': color,
                   'ts_name': ts_name
            }
            collection.insert(obj)
            count +=1

    return count


def MongoDBToTileset(collection, ts_name):
    ts = Tileset()
    for obj in collection.find({'ts_name': ts_name}):
        x, y, z = Tileid2(obj['tileid']).xyz()
        ts.set_tile(Tileid(x, y, z))
    return ts


def MongoDBToTilesets(collection):
    tss = {}
    for obj in collection.find():
        if obj['ts_name'] not in tss:
            tss[obj['ts_name']] = Tileset()
        x, y, z = Tileid2(obj['tileid']).xyz()
        tss[obj['ts_name']].set_tile(Tileid(x, y, z))
    return tss


if __name__ == '__main__':
    '''
    ts = ImageToTileset(directory=r'C:/_tiles/scrub', zoom=12,
                        x_start=759, y_start=1645, x_finish=767, y_finish=1653,
                        color=(0, 0, 0))
    #ts = Tileset(open('d:/ts_wood_11'))
    print(ts.level)
    ts.save(open('d:/ts_scrub_12', 'wb'))
    #TilesetToImage(ts, r"d:/temp_image3.bmp", fillcolor=(150, 150, 150), pencolor=(0, 0, 0))
    '''
    db_connection = MongoClient()
    db = db_connection.maindb
    ts = Tileset(open('d:/tiles/ts_road_15', 'rb'))
    print(TilesetToMongoDB(ts, db.tile_sets, '#555555', 'road'))
    # ts = Tileset(open('d:/ts_water_12'))
    # print(TilesetToMongoDB(ts, db.tile_sets, '#0000FF', 'water'))
    # ts = Tileset(open('d:/ts_wood_12'))
    # print(TilesetToMongoDB(ts, db.tile_sets, '#00FF00', 'wood'))