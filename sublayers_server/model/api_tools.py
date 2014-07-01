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
    func._public_method = True
    return func


class API(object):
    def __call__(self, method, params):
        method = method.strip()
        if not method or method[0] == '_' or not hasattr(self, method):
            raise EWrongMethodError('API Method {!r} is not supported.'.format(method))

        func = getattr(self, method)
        if not hasattr(func, '_public_method'):
            raise EWrongMethodError('API Method {!r} is not not allowed.'.format(method))

        log_call = '{method}({params})'.format(
            method=method,
            params=', '.join(['{}={!r}'.format(k, v) for k, v in params.items()]),
        )
        log.info('API call: %s ...', log_call)
        res = func(**params)
        log.info('API result: %s --> %r', log_call, res)
        return res


class TestAPI(API):
    @public_method
    def f(self, x, y=3, z=4):
        '===some about f method==='
        return x * 100 + y * 10 + z

api = TestAPI()

if __name__ == '__main__':
    pass
    
