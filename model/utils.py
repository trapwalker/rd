# -*- coding: utf-8 -*-

from Queue import PriorityQueue, Full
from time import time as _time
from itertools import chain, imap
import heapq

from uuid import uuid1 as get_uid
from time import time as get_time  # todo: integer vs float time


class TimelineQueue(PriorityQueue):
    #__slots__ = ['EMPTY'] # todo: future python versions optimization

    class EMPTY(object):
        __slots__ = []

    def remove(self, item, heapify=heapq.heapify, heappop=heapq.heappop):
        """Remove item from queue.
        :param item:
        :param heapify:
        :param heappop:
        :rtype : bool
        :return: True if item was in head
        """
        # todo: candidate for optimization
        is_remove_from_head = False
        with self.not_full:
            if self._head == item:
                self._head = heappop(self.queue) if len(self.queue) else self.EMPTY
                is_remove_from_head = True
            else:
                self.queue.remove(item)
                heapify(self.queue)

            self.not_empty.notify()

        return is_remove_from_head

    def __init__(self, iterable=()):
        PriorityQueue.__init__(self)
        self.queue.extend(iterable)
        heapq.heapify(self.queue)

    def clear(self):
        # todo: review
        with self.not_full:
            self._init(0)

    def __repr__(self):
        return '{}([{}])'.format(
            self.__class__.__name__,
            ', '.join(imap(repr, chain(
                [self._head] if not self._head == self.EMPTY else [],
                self.queue
            )))
        )

    __len__ = PriorityQueue.qsize
    def __nonzero__(self):
        return self._head is not self.EMPTY

    @property
    def head(self):
        if self._head is self.EMPTY:
            raise IndexError('Queue is empty')
        return self._head

    def _init(self, maxsize):
        self.queue = []
        self._head = self.EMPTY

    def _qsize(self, len=len):
        return 0 if self._head is self.EMPTY else (len(self.queue) + 1)

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

    def extend(self, iterator):
        for item in iterator:
            self.put(item)


__all__ = [get_uid, get_time, TimelineQueue]
