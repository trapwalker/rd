# -*- coding: utf-8 -*-

from Queue import PriorityQueue, Full
from time import time as _time
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
            return False

        return True

    def _get(self, heappop=heapq.heappop):
        if self._head is self.EMPTY:
            raise IndexError('Queue is empty')

        result = self._head
        self._head = heappop(self.queue) if len(self.queue) > 0 else self.EMPTY
        return result

    def put(self, item, block=True, timeout=None):
        """Put an item into the queue.
        Returns True if item set to head.

        If optional args 'block' is true and 'timeout' is None (the default),
        block if necessary until a free slot is available. If 'timeout' is
        a non-negative number, it blocks at most 'timeout' seconds and raises
        the Full exception if no free slot was available within that time.
        Otherwise ('block' is false), put an item on the queue if a free slot
        is immediately available, else raise the Full exception ('timeout'
        is ignored in that case).
        """
        self.not_full.acquire()
        try:
            if self.maxsize > 0:
                if not block:
                    if self._qsize() == self.maxsize:
                        raise Full
                elif timeout is None:
                    while self._qsize() == self.maxsize:
                        self.not_full.wait()
                elif timeout < 0:
                    raise ValueError("'timeout' must be a non-negative number")
                else:
                    endtime = _time() + timeout
                    while self._qsize() == self.maxsize:
                        remaining = endtime - _time()
                        if remaining <= 0.0:
                            raise Full
                        self.not_full.wait(remaining)
            is_put_to_head = self._put(item)
            self.unfinished_tasks += 1
            self.not_empty.notify()
        finally:
            self.not_full.release()

        return is_put_to_head


__ALL__ = [get_uid, get_time, TimelineQueue]
