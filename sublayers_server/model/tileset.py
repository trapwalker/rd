# -*- coding: utf-8 -*-

import logging.config
log = logging.getLogger(__name__)

from sublayers_server.model.tileid import Tileid, ROOT
from sublayers_server.model.tileid2 import Tileid2

from math import tan, pi
import copy


try:
    import cPickle as pickle
except:
    import pickle

import pdb

if not hasattr(__builtins__, 'bin'):
    from py25patch import bin

PRESENT = 1
ABSENT = 0
UNKNOWN = 2

SIGNATURE = '#TS'


class Link(tuple):
    def __new__(cls, *argv):
        return tuple.__new__(cls, argv)

    @property
    def item(self):
        return self[0][self[1]]

    @item.setter
    def item(self, value):
        self[0][self[1]] = value


class Q(list):
    def __init__(self, *argv):
        self.extend(argv)
        
    def __repr__(self):
        return 'Q({})'.format(list.__repr__(self).strip('[]'))


class Tileset(object):
    def __init__(self, value=ABSENT, level=None):
        if isinstance(value, file):
            assert level is None, u'При инициализации из файла level не указывается.'
            self._tree = [None]
            self._level = None
            self._maxlevel = 0
            self.load(value)
        elif isinstance(value, Tileset):
            assert level == None, u'При инициализации из тайлсета level не указывается.'
            self._level = value.level
            self._maxlevel = value._maxlevel
            self._tree = copy.deepcopy(value._tree)
        else:
            self._level = level # Nominal depth
            self._maxlevel = 0
            self._tree = [value]

    # todo: load from raster image

    @property
    def level(self):
        u'''Возвращает уровень индексируемого слоя.
        Если уровень слоя не был явно задан, то он оределяется
        по максимально глубокому добавленному тайлу.
        '''
        return self._maxlevel if self._level is None else self._level

    @level.setter        
    def level(self, newlevel=None):
        u'''Устанавливает уровень индексируемого слоя.
        newlevel может быть установлен только в значение <= maxlevel
        '''
        assert self._maxlevel <= newlevel, \
               u'В тайлсете есть тайлы с глубиной {0} > {1}'.format(self._maxlevel, newlevel)
        self._level = newlevel

    def capacity(self):
        u'''Мощность слоя level.'''
        return 4 ** self.level

    def set_tiles(self, ids, value=PRESENT):
        u'''Установка статусов для списка тайлов ids в значение value.
        ids -- итератор (например список) тайлов, заданных аналогично set_tile
        value -- новый статус тайлов, аналогично set_tile
        Функция возвращает кортеж со старыми значениями устанавливаемых узлов.'''
        return tuple(map(lambda id: self.set_tile(id, value), ids))

    def set_tile(self, tid=ROOT, value=PRESENT):
        u'''Установка статуса тайла id в значение value.
        id -- Tileid или путь к тайлу в виде списка квадрантов (int)
            пример списка: [0, 1, 2, 3, 2, 1] <==> Tileid('tqrtstr')
        value -- новый статус тайла. Помимо PRESENT и ABSENT может содержать
            любое скалярное значение или дерево кватернионов в виде системы
            вложенных списков: [0, [1, 0, [0, 0, 1, 0], 1], 0, 1]
        Функция возвращает старое значение устанавливаемого узла, причем,
        если устанавливаемый узел заменяет целую ветвь, то будет возвращена
        эта ветвь.
        '''
        # todo: не превращать iterable в Tileid
        id = tid if isinstance(tid, Tileid) else Tileid(tid)

        self._maxlevel = max(self._maxlevel, len(id))
        l = [Link(self._tree, 0)]
        for i in id:
            prev = l[-1]
            node = prev.item
            if not isinstance(node, Q):
                if node == value:
                    return value
                node = Q(node, node, node, node)
                prev.item = node
            l.append(Link(node, i))

        old = l[-1].item

        for i in reversed(l):
            if i.item == value:
                break
            i.item = value
            if i[0] != [value] * 4:
                break

        return old

    def get_tile(self, tid):
        u'''Определение статуса тайла id.'''
        # todo: не превращать iterable в Tileid
        id = tid if isinstance(tid, Tileid) else Tileid(tid)

        node = self._tree[0]
        for i in id:
            if not isinstance(node, Q):
                break
            node = node[i]
        return node

    def count_values(self, value=PRESENT): ## todo: убрать, если не нужна
        u'''Подсчет количества узлов с заданным значением в дереве.'''
        return count_in_tree(self._tree, value, nodeClasses=Q)

    def count(self, value=PRESENT):
        u'''Подсчет количества тайлов со статусом value.
        По умолчанию value = PRESENT'''
        def _cnt(node, level):
            if isinstance(node, Q):
                return sum(map(lambda t: _cnt(t, level + 1), node))
            elif node == value:
                return 4 ** (self.level - level)  # todo: optimize level getting
            else:
                return 0

        return _cnt(self._tree[0], 0)

    def statistics(self):
        u'''Получение статистики количества тайлов в различных статусах.
        Возвращает словарь {СТАТУС: КОЛИЧЕСТВО}.
        Количество ветвлений отражается под именем "__fork__"'''
        d = dict()

        def _add(item, cnt):
            try:
                if item in d:
                    d[item] += cnt
                else:
                    d[item] = cnt
            except TypeError:
                raise TypeError, u'В качестве элемента дерева был использован \
                    нехешируемый объект: {0!r}. \nВ этом случае использовать \
                    данную функцию нельзя.'.format(item)

        def _cnt(node, level):
            if isinstance(node, Q):
                _add('__fork__', 1)
                for i in node:
                    _cnt(i, level + 1)
            else:
                _add(node, 4 ** (self.level - level))

        _cnt(self._tree[0], 0)
        return d

    def iter_tree_deep(self):
        u'''Итаратор обхода дерева в глубину.
        Возвращает кортежи (Tileid, <значение_узла>).'''
        stack = [(Tileid(), self._tree[0])]
        while len(stack) > 0:
            idnt, node = stack.pop()
            yield idnt, node
            if isinstance(node, Q):
                stack.extend(reversed(zip(idnt.childs(), node)))

    def iter_leafs(self):
        u'''Итератор обхода листьев дерева.
        Возвращает кортежи (Tileid, <статус узла>).'''
        for i in self.iter_tree_deep():
            if not isinstance(i[1], Q):
                yield i

    def remap(self, remap_dict):
        u'''Замена элементов тайлсета по словарю remap_dict.'''
        def f(x):
            if isinstance(x, Q) and x == [x[0]] * 4:
                return x[0]

            if isinstance(x, Q) or x not in remap_dict:
                return x

            return remap_dict[x]
                
        self._tree[0] = map_tree(self._tree[0], f, Q)
        
    def _save_auto_params(self):
        u'''Приватная функция возвращает словарь автоматически подобранных
        параметров для сохранения дерева в бинарный файл:
            bpn      - бит на узел (2, 4 или 8) в зависимости от разнообразия
                       значений в листьях дерева;
            mask     - битовая маска для выделения одного элемента дерева;
            fork     - код для нелистового узла дерева;
            d_encode - словарь кодирования листовых значений в бинарную форму;
            d_decode - словарь декодирования бинарных представлений в значения
                       узлов (сохраняется в заголовок файла, а при загрузке
                       считывается и используется для восстановления исходного
                       дерева).'''
        # Определение минимально необходимого числа бит на узел
        stat = self.statistics()
        from math import log, ceil
        bpn = int(ceil(log(len(stat.keys()), 2)))
        del log, ceil

        # Выравнивание числа бит по сетке 2, 4, 8
        if   bpn <= 2: bpn = 2
        elif bpn <= 4: bpn = 4
        elif bpn <= 8: bpn = 8
        else:
            raise Exception, u'Сохранение деревьев с количеством состояний ' \
                             u'листьев, превышающим 254, не поддерживается.'
        mask = 2 ** bpn - 1

        # словарь кодирования значений узлов при сохранении
        d_encode = {}
        # словарь декодирования значений узлов при загрузке
        d_decode = {'__bpn__': bpn, '__level__': self.level}
        # допустимые коды элементов дерева
        codespace = range(0, 2 ** bpn)
        # пространство значений листьев дерева
        keyspace = [i for i in sorted(stat.keys()) if i != '__fork__']

        # Стараемся кодировать листья реальными их значениями в дереве
        for i in keyspace[:]:
            if i in codespace:
                d_encode[i] = i
                d_decode[i] = i
                codespace.remove(i)
                keyspace.remove(i)

        assert len(keyspace) + 1 <= len(codespace), u'некорректно определён BPN'

        # Выбираем в качестве кода для ветвления в дереве последний незанятый
        fork = codespace.pop()
        d_decode['__fork__'] = fork

        # Кодируем оставшиеся листья
        d_encode.update(zip(keyspace, codespace))
        d_decode.update(zip(codespace, keyspace))
        # todo: добавить уровень слоя
        del codespace, keyspace, stat
        return bpn, mask, fork, d_encode, d_decode

    def save(self, f, raw=False):
        u'''Сохранение маски покрытия в файловый объект f.
            raw -- флаг, отключающий запись заголовка в файл.
        '''
        # Получаем набор параметров сохранения
        bpn, mask, fork, d_encode, d_decode = self._save_auto_params()
        print 'bpn=', bpn, mask, fork
        if not raw:
            f.write(SIGNATURE)
            pickle.dump(d_decode, f)

        buf = 0; shift = 0
        #pdb.set_trace()
        for i in self.iter_tree_deep():
            x = fork if isinstance(i[1], Q) else d_encode[i[1]]
            buf |= (x & mask) << shift
            shift += bpn
            if shift >= 8:
                f.write(chr(buf))
                buf = 0
                shift = 0

        if shift > 0:
            f.write(chr(buf))

    def load(self, f):
        u'''Загрузка маски покрытия из файлового объекта f.'''
        assert f.read(len(SIGNATURE)) == SIGNATURE, u'Данный формат файла не поддерживается.'
        d_decode = pickle.load(f) # todo: обработка ошибок
        self._maxlevel = 0
        self._level = d_decode.pop('__level__')
        bpn = d_decode.pop('__bpn__')
        fork = d_decode.pop('__fork__')
        stack = [Link(self._tree, 0, 0)] # (parent, index, deep) <==> parent[index], deep
        #print d_decode
        for node_code in bitreader(f, bpn):
            if len(stack) == 0:
                break

            node = stack.pop()
            if node_code == fork:
                node.item = Q(None, None, None, None)
                stack.extend([Link(node.item, i, node[2] + 1) for i in (3, 2, 1, 0)])
            else:
                node.item = d_decode[node_code]
                if node[2] > self._maxlevel:
                    self._maxlevel = node[2]

    __getitem__ = get_tile # todo: slice support
    __setitem__ = set_tile # todo: slice support

    # todo: inv, add, and_, or_, contains, countOf
    # todo: iadd, iand, ior, isub, ixor

    def __iadd__(self, other): #todo: решить как поступать в случаях коллизий в бинарных операциях. Что принять за 0
        if isinstance(other, Tileset):
            for i in other.iter_leafs():
                if not self[i[0]]:
                    self.set_tile(*i)
            return self
        else:
            raise Exception, u'Type error: <{0}> += <{1}>'.format(type(self), type(other))

    def __eq__(self, other):
        ## Сравнение Tileset'ов без учета глубины
        return isinstance(other, self.__class__) \
               and self._tree == other._tree
               ##and self.level == other.level \

    def __repr__(self):
        return '{0}({1!r}, {2})'.format(
            self.__class__.__name__,
            self._tree[0],
            self.level)

    def get_tile2(self, tid):
        parent = id = tid if isinstance(tid, Tileid) else Tileid(tid)
        parent_color = color = self.get_tile(id)
        #todo: если isinstance(color, Q) - вылет с ошибкой!!!
        while not isinstance(parent_color, Q):
            color = parent_color
            id = parent
            parent = parent.parent()
            parent_color = self.get_tile(parent)
        return (color, id)


    def intersect_by_ray(self, tid, a, border_tid=None, distance=0):
        u'''
            tid - объект класса Tileid
            a - угол в радианах от 0 <= a < 2*pi, относительно севера!
            border_tid - ограничивающий расчеты Tileid
            distance - ограничивыающая расчеты дистанция
            возвращает кортеж ((x, y, z), ox, oy, flag), где:
                (x, y, z) - координаты Tileid (могут быть не корректны)
                ox, oy - относительные (0 .. 1) координаты в Tileid
                flag - факт смены цвета (false: некорректный тайл или выход за ограничитель расчётов)
                                        (true: цвет сменён)
        '''

        def parent_filter(nx, ny, nz):
            return (border_tid is None) or Tileid2(nx, ny, nz).is_child(border_tid)

        def get_next_tile(tile, ox, oy):
            # вывзывать данную функцию только для листовых тайлов

            def x_is_1():
                yy = k + b
                return (0, yy, 0 <= yy <= 1, (tx + 1, ty, tz))

            def x_is_0():
                yy = b
                return (1, yy, 0 <= yy <= 1, (tx - 1, ty, tz))

            def y_is_1():
                xx = (1 - b) / k
                return (xx, 0, 0 <= xx <= 1, (tx, ty + 1, tz))

            def y_is_0():
                xx = -b / k
                return (xx, 1, 0 <= xx <= 1, (tx, ty - 1, tz))

            #todo: Перенести в классовый метод Tileid
            def is_correct_tile(x, y, z):
                max = 2 ** z
                return 0 <= x < max and 0 <= y < max

            '''
            # Вариант реализации фильтра по дистанции
            def dist_filter(ox, oy, nx, ny, nz):
                if dist == 0:
                    return True
                _nx = (nx + ox) * (2 ** (z - nz))
                _ny = (ny + oy) * (2 ** (z - nz))
                val = (_nx - x) ** 2 + (_ny - y) ** 2
                return val < dist
            '''

            def get_intersect_point(func1, func2):
                ox1, oy1, is_corr, tile1 = func1()
                if not is_corr:
                    ox1, oy1, is_corr, tile1 = func2()
                return (ox1, oy1, is_corr, tile1)


            tx, ty, tz = tile.xyz()
            ox1 = oy1 = is_corr = tile1 = None

            if a == 0:
                ox1 = ox
                oy1 = 1
                tile1 = (tx, ty-1, tz)
                is_corr = True
            elif a == pi:
                ox1 = ox
                oy1 = 0
                tile1 = (tx, ty+1, tz)
                is_corr = True
            elif a == pi/2:
                ox1 = 0
                oy1 = oy
                tile1 = (tx+1, ty, tz)
                is_corr = True
            elif a == 3 * pi / 2:
                ox1 = 1
                oy1 = oy
                tile1 = (tx-1, ty, tz)
                is_corr = True
            else:
                tg = tan(a)
                k = - 1 / tg
                b = ox / tg + oy
                if 0 < a < pi / 2:      # x = 1 или y = 0
                    ox1, oy1, is_corr, tile1 = get_intersect_point(x_is_1, y_is_0)
                elif pi / 2 < a < pi:     # x = 1 или y = 1
                    ox1, oy1, is_corr, tile1 = get_intersect_point(x_is_1, y_is_1)
                elif pi < a < 3 * pi / 2:  # x = 0 или y = 1
                    ox1, oy1, is_corr, tile1 = get_intersect_point(x_is_0, y_is_1)
                elif pi < a < 2 * pi:      # x = 0 или y = 0
                    ox1, oy1, is_corr, tile1 = get_intersect_point(x_is_0, y_is_0)

            # todo: в возврате функции вместо флага использовать выражение ниже
            if not is_corr or not is_correct_tile(tile1[0], tile1[1], tile1[2]):
                return ox1, oy1, tile1, False
            return ox1, oy1, tile1, True


        def recursion_func(tile, ox, oy):
            color1, tile1 = self.get_tile2(tile)
            tx1, ty1, tz1 = tile1.xyz()
            if not isinstance(color1, Q):
                dz = 2 ** (tile.zoom() - tile1.zoom())
                tx, ty, tz = tile.xyz()
                ox1 = float(ox) / dz + float(tx - tx1 * dz) / dz
                oy1 = float(oy) / dz + float(ty - ty1 * dz) / dz
                if color1 != color:
                    return tile1.xyz(), ox1, oy1, True
                else:
                    _px, _py, _pz = tile1.xyz()
                    if not parent_filter(_px, _py, _pz):
                        return tile1.xyz(), ox1, oy1, False
                    ox2, oy2, tile2, flag = get_next_tile(tile1, ox1, oy1)
                    if not flag:
                        return tile2, ox2, oy2, False
                    return recursion_func(Tileid(tile2[0], tile2[1], tile2[2]), ox2, oy2)
            else:
                tx1 *=2
                ty1 *=2
                tz1 +=1
                #найти нужного ребёнка
                if ox > 0.5:
                    tx1 += 1
                    ox -= 0.5
                if oy > 0.5:
                    ty1 += 1
                    oy -= 0.5
                ox *= 2
                oy *= 2
                return recursion_func(Tileid(tx1, ty1, tz1), ox, oy)

        #dist = distance ** 2
        color, tile = self.get_tile2(tid)
        x, y, z = tid.xyz()
        tx, ty, tz = tile.xyz()
        # получить относительные координаты
        ox = float(x) / (2 ** (z - tz)) - tx
        oy = float(y) / (2 ** (z - tz)) - ty
        ox1, oy1, tile1, flag = get_next_tile(tile, ox, oy)
        if not flag:
            return tile1, ox1, oy1, False
        return recursion_func(Tileid(tile1[0], tile1[1], tile1[2]), ox1, oy1)





#------------------------------------------------------------------------------
def bitreader(f, bitcount):
    mask = 2 ** bitcount - 1
    steps = range(8 / bitcount)
    byte = f.read(1)
    while byte != '':
        byte = ord(byte[0])
        for i in steps:
            yield byte & mask
            byte >>= bitcount
        byte = f.read(1)

def map_tree(tree, func, nodeClasses=(list, tuple)):
    u'''Заменяет элементы в дереве tree на результаты фнкции func над ними.'''
    if isinstance(tree, nodeClasses):
        tree = Q(*[map_tree(i, func, nodeClasses) for i in tree])
    return func(tree)
    
"""def remap_tree(tree, d):
    u'''Заменяет элементы в дереве tree по словарю d.'''
    if isinstance(tree, Q):
        return [remap_tree(i, d) for i in r]
    else:
        if tree in d:
            return d[tree]
        else:
            return tree
"""

def count_in_tree(tree, value, nodeClasses=(list, tuple)):
    u'''Рекурсивный подсчет количества элементов value в дереве на списках
    или кортежах.
    ВНИМАНИЕ! Нет проверки на циклические ссылки.'''
    if tree == value:
        return 1
    elif isinstance(tree, nodeClasses):
        return sum(map(lambda t: count_in_tree(t, value, nodeClasses), tree))
    else:
        return 0

##############################################################################
if __name__ == '__main__':
    from image_to_tileset import TilesetToImage, ImageToTileset
    ts = Tileset(open('d:/ts'))

    '''
    #ts = Tileset()
    ts.set_tile(Tileid(2, 2, 3))
    ts.set_tile(Tileid(6, 6, 4))
    ts.set_tile(Tileid(5, 2, 3))
    ts.set_tile(Tileid(0, 0, 10))
    ts.set_tile(Tileid(0, 1023, 10))
    '''
    #TilesetToImage(ts, r"d:/temp_image2.bmp", fillcolor=(150, 150, 150), pencolor=(0, 0, 0))

    ts2 = Tileset()

    zoom = 10
    for angle in xrange(0, 359):
        res =  ts.intersect_by_ray(Tileid(530, 530, 10), pi*(float(angle))/180, Tileid2(515, 515, 10).parent_by_lvl(1))
        print res, angle
        if not (res is None):
            x, y, z = res[0]
            if (x > 0) and (y > 0):
                x = x + res[1]
                y = y + res[2]
                x = x * (2**(zoom-z))
                y = y * (2**(zoom-z))
                z = zoom
                ts2.set_tile(Tileid(int(x), int(y), z))
    TilesetToImage(ts2, r"d:/temp_image7.bmp", fillcolor=(150, 150, 150), pencolor=(0, 0, 0))








    
