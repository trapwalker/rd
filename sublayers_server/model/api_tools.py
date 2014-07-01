# -*- coding: utf-8 -*-

import logging.config
if __name__ == '__main__':
    logging.config.fileConfig("../logging.conf")
log = logging.getLogger(__name__)

log.debug('-='*30)

import functools


class EAPIError(Exception):
    """Abstract API exception"""


class EWrongMethodError(EAPIError):
    """Unsupported method"""


class EWrongParamsError(EAPIError):
    """Unsupported params format"""


def public_method(func):
    """API public method decorator"""
    def cover(*av, **kw):
        log_call = '{method}({params})'.format(
            method=func.__name__,
            params=', '.join(map(repr, av) + ['{}={!r}'.format(k, v) for k, v in kw.items()]),
        )
        log.info('API call: %s ...', log_call)
        try:
            res = func(*av, **kw)
        except TypeError as e:
            log.error('API error: %s !-> %r', log_call, e)
            raise EWrongParamsError(e.message)
        log.info('API result: %s --> %r', log_call, res)
        return res

    functools.update_wrapper(cover, func)
    cover._public_method = True
    return cover


class API(object):
    """Base API provider class"""
    def __call__(self, method, params):
        method = method.strip()
        if not method or method[0] == '_' or not hasattr(self, method):
            raise EWrongMethodError('API Method {!r} is not supported.'.format(method))

        func = getattr(self, method)

        if not callable(func):
            raise EWrongMethodError('{!r} is not API method.'.format(method))

        if not hasattr(func, '_public_method'):
            raise EWrongMethodError('API Method {!r} is not allowed.'.format(method))

        return func(**params)


if __name__ == '__main__':
    class TestAPI(API):
        g = 13

        @public_method
        def f(self, x, y=3, z=4):
            """===some about f method==="""
            return x * 100 + y * 10 + z, self.g

    api = TestAPI()
    print api.f(1, y=2)
    print api(method='f', params=dict(x=1, y=2))
