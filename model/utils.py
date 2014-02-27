# -*- coding: utf-8 -*-

from Queue import PriorityQueue
import heapq

from uuid import uuid1 as get_uid
from time import time as get_time  # todo: integer vs float time


class TimelineQueue(PriorityQueue):
    #__slots__ = ['EMPTY'] # todo: future python versions optimization

    class EMPTY(object):
        __slots__ = []

    @property
    def head(self):
        if self._head is self.EMPTY:
            raise IndexError('Queue is empty')
        return self._head

    def _init(self, maxsize):
        self.queue = []
        self._head = None

    def _qsize(self, len=len):
        return len(self.queue) + (0 if self._head is self.EMPTY else 1)

    def _put(self, item, heappush=heapq.heappush):
        if self._head is self.EMPTY:
            self._head = item
        elif item < self._head:
            heappush(self.queue, self._head)
            self._head = item
        else:
            heappush(self.queue, item)

    def _get(self, heappop=heapq.heappop):
        if self._head is self.EMPTY:
            raise IndexError('Queue is empty')

        result = self._head
        self._head = heappop(self.queue) if len(self.queue) > 0 else self.EMPTY
        return result


__ALL__ = [get_uid, get_time, TimelineQueue]
