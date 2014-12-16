# -*- coding: utf-8 -*-


from collections import Counter

class ETileException(Exception):
    pass

ROOTBIN = 0 # самый первый тайл, с координатами 0 0 0
MAX_BIT_COUNT = 63 # не рекомендуется использовать большее значение, т.к. Python переходит на вещественные числа
MAX_ZOOM = 31      # под хранения z отводится 5 бит (32 уровня глубины), допустимые значения 2^n-1



def xyz2bin(x, y, z):
    u"""
    Преобразование кортежа (x, y, zoom) в бинарное представление индекса тайла.
    """
    if z > MAX_ZOOM:
        raise ETileException('Недопустимое значение z-индекса')
    b = 0
    for i in xrange(z):
        b |= ((y & 1) << 1) << (i << 1)
        b |= (x & 1) << (i << 1)
        y >>= 1
        x >>= 1
    return (b  << (MAX_BIT_COUNT - (z << 1))) | z


def bin2xyz(binary):
    u"""
    Преобразование бинарного представления индекса тайла в кортеж (x, y, zoom).
    """
    b = long(binary)
    x = y = 0
    z = b & MAX_ZOOM
    b >>=  MAX_BIT_COUNT - (z << 1)
    for i in xrange(z):
        x |= (b & 1) << i
        b >>= 1
        y |= (b & 1) << i
        b >>= 1
    return x, y, z



class Tileid2(long):
    u"""
    Индекс тайла.
    Представляется в виде бинарной последовательности из 64 бит,
    младшие 8 бит отвечают за глубину тайла (объекта, т.е. z - координата)
    старшие за положение в дереве.
    """

    def __new__(cls, *args):
        # если нет параметров, то вернуть индекс корня дерева
        if len(args) == 0:
            return long.__new__(cls, ROOTBIN)
        # если есть 3 параметра, предположить, что это x y z
        elif len(args) == 3:
            return long.__new__(cls, xyz2bin(*args))
        # если аргумент 1, то проверить является ли он Tileid
        elif len(args) == 1:
            arg = args[0]
            #print arg
            # если аргумент является Tileid, то вернуть аргумент
            if isinstance(arg, Tileid2):
                return arg
            # если аргумент None, то вернуть индекс корня дерева
            if arg is None:
                return long.__new__(cls, ROOTBIN)
            # если аргумент является числом
            if isinstance(arg, long):
                return long.__new__(cls, arg)

        raise ETileException(u'''Некорректный набор параметров "{!r}".
            Ожидается: (x, y, z)|<Tileid>
            где: (x, y, z) -- tuple of three int
            <Tileid> -- объект типа Tileid'''.format(args))

    def isroot(self):
        return self == ROOTBIN

    def xyz(self):
        u"""Представление индекса в виде кортежа (x, y, zoom)."""
        if not hasattr(self, '_x'):
            self._x, self._y, self._z = bin2xyz(self)
        return self._x, self._y, self._z

    def zoom(self):
        u"""Возвращает z координату Tileid."""
        if not hasattr(self, '_z'):
            #noinspection PyAttributeOutsideInit
            self._x, self._y, self._z = bin2xyz(self)
        return self._z

    def parent(self, levelup=1):
        u"""
        Возвращает предка на levelup уровней выше.
        При попытке получить предка корня генерируется исключение.
        """
        z = self.zoom()
        assert 0 <= levelup <= z, u'Некорректно указан относительный уровень предка '
        z -= levelup
        mask = (2 ** (z << 1) - 1) << (MAX_BIT_COUNT - (z << 1))
        return Tileid2(((self & mask) | z))

    def parent_by_lvl(self, level):
        u"""
        Возвращает предка на level уровне.
        При попытке получить предка корня генерируется исключение.
        """
        z = self.zoom()
        assert 0 <= level <= z, u'Некорректно указан уровень предка.'
        return self.parent(z - level)

    def index_child_first(self, level=1):
        z = self.zoom()
        assert z + level < MAX_ZOOM, u'Достигнут максимальный зум.'
        return Tileid2(self + level)

    def index_child_last(self):
        z = self.zoom()
        assert z < MAX_ZOOM, u'Достигнут максимальный зум.'
        return Tileid2(self | (2 ** (MAX_BIT_COUNT - (z << 1)) - 1))

    def in_tile(self, tile):
        # если тайлы не одинаковые
        if self == tile:
            return True
        #проверить по зумам
        if self.zoom() > tile.zoom():
            if tile.index_child_first() <= self <= tile.index_child_last():
                return True
        return False

    def childs(self, level=1):
        u"""Итератор, перечисляющий всех потомков на уровне level вниз от текущего."""
        assert isinstance(level, int) and level >= 0 and level + self.zoom() < MAX_ZOOM, \
            u'Некорректное значение аргумента level: {}'.format(level)
        size = 2 ** level
        sx, sy, sz = self.index_child_first(level).xyz()
        for y in xrange(size):
            for x in xrange(size):
                yield Tileid2(sx+x, sy+y, sz)



    def in_rect(self, tl, br):
        tile_list = Tileid2().iter_rect(tl, br)
        for tile in tile_list:
            if self.in_tile(tile):
                return True
        return False


    @classmethod
    def iter_rect(cls, tl, br):
        # возвращает итератор тайлов по выбранному прямоугольнику
        # проверить корректность tl и br
        assert tl.zoom() == br.zoom(), u'Аргументы не должны иметь разные Z'
        x1, y1, z = tl.xyz()
        x2, y2, z = br.xyz()
        assert (x1 <= x2) and (y1 <= y2), u'Неправильно задан прямоугольник'

        # получить список Tileid на уровне z
        tile_list = []
        for x in xrange(x1, x2 + 1):
            for y in xrange(y1, y2 + 1):
                tile_list.append(Tileid2(x, y, z))

        # схлопывание тайлов по их родителям
        while len(tile_list) > 0 and z > 0: # z нужен, чтобы не делать IF в каждом цикле
            # заполнение parent_counter
            parent_counter = Counter()
            for e in tile_list:
                parent_counter[e.parent(1)] += 1

            # тайлы которые не схлопнулись вывести в результат
            for e in tile_list:
                if parent_counter[e.parent(1)] < 4:
                    yield e

            # получаем тайлы верхнего уровня
            tile_list = []
            for e in parent_counter:
                if parent_counter[e] == 4:
                    tile_list.append(e)
            z -= 1

        for e in tile_list:
            yield e


if __name__ == '__main__':
    t = Tileid2(1, 1, 2)

    for tile in t.childs(0):
        print tile.xyz()








