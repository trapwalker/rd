
from contacts import Contact as Ct
from contacts__object import Contact as Co
from contacts__list import Contact as Cl
from utils import TimelineQueue as Q
from utils import get_time

import sys
import time
import random


def get_test_time(start=get_time(), sigma=60*60):
    return start + sigma * random.random()
 
class Profiler(object):

    def __init__(self, desc=''):
        self._desc = desc + ' -- ' if desc else ''
    
    def __enter__(self):
        self._startTime = time.time()
         
    def __exit__(self, type, value, traceback):
        print "{}Elapsed time: {:.3f} sec".format(self._desc, time.time() - self._startTime)


def test(cls, n=100000):
    q = Q()
    for i in xrange(n):
        q.put(cls(get_test_time(),2,3,4))

    while q:
        q.get()
        

if __name__ == '__main__':
    n = 1000000
    with Profiler('Tuple ') as p:
        test(Ct, n=n)

    with Profiler('Object') as p:
        test(Co, n=n)

    with Profiler('List  ') as p:
        test(Cl, n=n)
