# -*- coding: utf-8 -*-
import logging
log = logging.getLogger(__name__)

from Queue import PriorityQueue, Full
from time import time as _time
from datetime import datetime
import heapq
from pprint import pformat
from functools import total_ordering, partial
from copy import copy
import json
from uuid import uuid1 as get_uid, UUID
from time import time as get_time  # todo: integer vs float time
from weakref import WeakSet, ref
from collections import Callable
import random
# import slugger  # todo: search good slugger lib


# _slugger = slugger.Slugger(lang='ru_RU', invalid_replacement='_')
# slug = _slugger.sluggify

TimeClass = get_time().__class__

NATO_ABC = ('Alpha Bravo Charlie Delta Echo Foxtrot Golf Hotel India Juliet Kilo Lima Mike November Oscar Papa '
            'Quebec Romeo Sierra Tango Uniform Victor Whiskey Xray Yankee Zulu').split()


class NameGenerator(object):
    adjectives = '''Mad Adventurous Affectionate Aggressive Ambitious Angry Arrogant Boastful Brave Brutal Calm Candid
Carefree Changeable Competent Competitive Considerate Courageous Cowardly Creative Critical Dedicated Demanding 
Determined Devoted Dishonest Dominant Eas Egocentric Emotional Energetic Excitable Experienced Extrovert Fai Flabby 
Forgetful Frank Fussy Generous Gentle Gullible Har Ho Humble Hypocritical Imaginative Impatient Impetuous 
Impressionable Impulsive Indecisive Insincere Irresponsible Lively Logical Loyal Malicious Materialistic Mercenary 
Modest Narro Obedient Obstinate Open Outgoing Passionate Passive Petty Pompous Possessive Practical Presumptuous 
Protective Proud Rational Realistic Rebellious Remarkable Reserved Respectful Revolutionary Rude Ruthless Secretive 
Selfish Sensible Sensitive Sentimental Shy Snobbish Spiteful Stubborn Taciturn Talkative Temperamental Tender 
Thoughtful Timid Tolerant Truthful Uncontrollable Understanding Unpredictable Unreliable Unscrupulous Unstable 
Vain Versatile Vicious Vindictive Violent'''.split()

    animals = '''shark alligator alpaca anaconda antelope wild ram asp baboon sheep American bear badger snipe
squirrel bison beaver chipmunk bull camel wolf otter desman viper gazelle hamadryas gecko cheetah gibbon hyena 
hippopotamus gnu gorilla grizzly goose porcupine dingo dinosaur coon echidna hedgehog toad giraffe hare zebra snake 
aurochs iguana turkey leopard boar cayman spurdog cachalot frog kangaroo whale cobra koala goat coyote horse cow 
tomcat cat crocodile rabbit mole rat duck marten chicken lama manatee lobster deer weasel lion lemming lemur sloth 
leopard fox lobster elk horse frog macaque mammoth mongoose baboon marmoset bear grass snake mollusc walrus cavy 
anteater mouse rhea narwhal rhino monkey ape sheep okapi opossum donkey ass octopus baboon panther penguin puma 
cougar crawfish glutton lynx saiga salamander pig swine hog sowboar serval chamois skunk dog sable marmot suslik 
tapir tiger seal boa duck chameleon hamster polecat tortoise chimpanzee chinchilla jaguar yak lizard'''.split()
    
    short_list = NATO_ABC[:]

    __doc__ = """ Returns one from {} combinations of pair (adjective, animal)
    and {} variants of login like 'MadFrog123'.""".format(
        len(adjectives) * len(animals), len(adjectives) * len(animals) * 900)

    @classmethod
    def pair(cls):
        return random.choice(cls.adjectives).capitalize(), random.choice(cls.animals).capitalize(),

    @classmethod
    def login(cls, a, b, test=False):
        if test and cls.short_list:
            return cls.short_list.pop(0)
        
        return ''.join([a, b, str(random.randrange(100, 1000))])

    @classmethod
    def new(cls, test=False):
        fname, lname = cls.pair()
        return dict(fname=fname, lname=lname, login=cls.login(fname, lname, test=test))


def special_type_serialize_prepare(obj):
    from sublayers_server.model.vectors import Point

    if isinstance(obj, datetime):
        return obj.isoformat()
    elif isinstance(obj, (Point, complex)):
        return dict(x=obj.real, y=obj.imag)
    elif isinstance(obj, UUID):
        return str(obj)
    elif hasattr(obj, 'as_client_dict'):
        return obj.as_client_dict()
    elif hasattr(obj, 'as_dict'):
        return obj.as_dict()

    log.warning('Specific type to json serialization: %r', obj)
    return str(obj)


def serialize(obj, **kw):
    return json.dumps(obj, sort_keys=True, indent=4, default=special_type_serialize_prepare, **kw)


class AttrPreserve(object):
    '''Proxy object '''
    def __init__(self, obj, na_errors=None, hide_errors=(Exception,)):
        self._covered_object = obj
        self._na_errors = na_errors
        self._hide_errors = hide_errors

    @property
    def classname(self):
        return self._covered_object.__class__.__name__

    def __getattr__(self, name):
        try:
            return getattr(self._covered_object, name)
        except (AttributeError,) + (self._na_errors or ()):
            return '#NA'
        except self._hide_errors or ():
            return '#ERROR'


class TimeFormatter(object):
    def __init__(self, fmt='{:%Y-%m-%d %H:%M:%S.%f}'):
        self.fmt = fmt

    def __call__(self, t):
        try:
            dt = datetime.fromtimestamp(t)
        except ValueError as e:
            log.exception('Wrong time: %r', t)
            raise e

        s = self.fmt.format(dt)
        if self.fmt.endswith('%f}'):
            s = s[:-3]
        return s

    __getitem__ = __call__


time_log_format = TimeFormatter('{:%H:%M:%S.%f}')


class TimelineQueue(object, PriorityQueue):
    #__slots__ = ['EMPTY'] # todo: future python versions optimization

    @total_ordering
    class EMPTY(object):
        __slots__ = []

        def __nonzero__(self):
            return False

        def __gt__(self, other):
            return True

    def __getnewargs__(self):
        return (list(self),)

    def __getstate__(self):
        return

    def remove(self, item, heapify=heapq.heapify, heappop=heapq.heappop):
        """Remove item from queue.
        @rtype: bool
        @return: True if item was in head
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
        return '{}(\n{}\n)'.format(
            self.__class__.__name__,
            pformat(list(self), width=1, indent=4)
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

    def _qsize(self, _len=len):
        return 0 if self._head is self.EMPTY else (_len(self.queue) + 1)

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

    def __copy__(self):
        q = TimelineQueue()
        q.queue = copy(self.queue)
        q._head = self._head
        return q

    def __iter__(self):
        q = copy(self)
        while q:
            yield q.get()


class SubscriptionList(WeakSet):
    def _send(self, method, *av, **kw):
        # todo: генерировать как отдельные события? ##optimize
        results = []
        for subscriber in self:
            f = getattr(subscriber, method, None)
            if isinstance(f, Callable):
                results.append((ref(subscriber), f(*av, **kw)))

    def __getattr__(self, item):
        return partial(self._send, method=item)

    def remove(self, item):
        try:
            super(SubscriptionList, self).remove(item)
        except KeyError:
            pass

KARMA_NAMES = [u'Новая надежда', u'Мессия', u'Спаситель', u'Святой', u'Герой', u'Страж', u'Борец', u'Спасатель',
    u'Защитник', u'Друг людей', u'Правильный', u'Честный парень', u'Партнер', u'Славный малый', u'Поселенец',
    u'Человек простой', u'Странник', u'Наблюдатель', u'Выживальщик', u'Авантюрист', u'Равнодушный', u'Циник',
    u'Хулиган', u'Жулик', u'Изгой', u'Мошенник', u'Грабитель', u'Захватчик', u'Убийца', u'Псих', u'Больной ублюдок',
    u'Маньяк', u'Антихрист']
KARMA_NAMES_RU = [u'Новая надежда', u'Мессия', u'Спаситель', u'Святой', u'Герой', u'Страж', u'Борец', u'Спасатель',
    u'Защитник', u'Друг людей', u'Правильный', u'Честный парень', u'Партнер', u'Славный малый', u'Поселенец',
    u'Человек простой', u'Странник', u'Наблюдатель', u'Выживальщик', u'Авантюрист', u'Равнодушный', u'Циник', 
    u'Хулиган', u'Жулик', u'Изгой', u'Мошенник', u'Грабитель', u'Захватчик', u'Убийца', u'Псих', u'Больной ублюдок', 
    u'Маньяк', u'Антихрист']
KARMA_NAMES_ENG = [u'New hope', u'Messiah', u'Savior', u'Saint', u'Hero', u'Guardian', u'Fighter', u'Rescuer',
    u'Defender', u'Friend of the people', u'Proper', u'Honest guy', u'Partner', u'Good fellow', u'Settler',
    u'Simple man', u'Wanderer', u'Spectator', u'Survivalist', u'Adventurer', u'Indifferent', u'Cynic', u'Bully',
    u'Rogue', u'Outlaw', u'Rascal', u'Looter', u'Raider', u'Killer', u'Psycho', u'Sick bastard', u'Maniac', 
    u'Antichrist']


def getKarmaName(karma, lang):
    karma_names = [] 
    if lang == 'ru': 
        karma_names = KARMA_NAMES_RU
    elif lang == 'en':
        karma_names = KARMA_NAMES_ENG
    else:
        return ''                             
    if karma >= 1:
        return karma_names[0]
    if karma >= 0.85:
        return karma_names[1]
    if karma >= 0.75:
        return karma_names[2]
    if karma >= 0.65:
        return karma_names[3]
    if karma >= 0.6:
        return karma_names[4]
    if karma >= 0.55:
        return karma_names[5]
    if karma >= 0.5:
        return karma_names[6]
    if karma >= 0.45:
        return karma_names[7]
    if karma >= 0.4:
        return karma_names[8]
    if karma >= 0.35:
        return karma_names[9]
    if karma >= 0.3:
        return karma_names[10]
    if karma >= 0.25:
        return karma_names[11]
    if karma >= 0.2:
        return karma_names[12]
    if karma >= 0.15:
        return karma_names[13]
    if karma >= 0.1:
        return karma_names[14]
    if karma >= 0.05:
        return karma_names[15]    
    if karma >= -0.05:
        return karma_names[16]
    if karma >= -0.1:
        return karma_names[17]
    if karma >= -0.15:
        return karma_names[18]
    if karma >= -0.2:
        return karma_names[19]
    if karma >= -0.25:
        return karma_names[20]
    if karma >= -0.3:
        return karma_names[21]
    if karma >= -0.35:
        return karma_names[22]
    if karma >= -0.4:
        return karma_names[23]
    if karma >= -0.45:
        return karma_names[24]
    if karma >= -0.5:
        return karma_names[25]
    if karma >= -0.55:
        return karma_names[26]
    if karma >= -0.6:
        return karma_names[27]
    if karma >= -0.65:
        return karma_names[28]
    if karma >= -0.75:
        return karma_names[29]
    if karma >= -0.85:
        return karma_names[30]
    if karma >= -1:
        return karma_names[31]
    return karma_names[32]


__all__ = [get_uid, get_time, TimelineQueue]
