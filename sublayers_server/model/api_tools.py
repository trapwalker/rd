# -*- coding: utf-8 -*-

import logging.config
if __name__ == '__main__':
    logging.config.fileConfig("../logging.conf")
log = logging.getLogger(__name__)


import functools
import tornado.escape  # todo: Need to be abstracted from tornado

from utils import serialize


class EAPIError(Exception):
    """Abstract API exception"""


class EWrongMethodError(EAPIError):
    """Unsupported method"""


class EWrongParamsError(EAPIError):
    """Unsupported params format"""


class EWrongMethodCallingFormat(EAPIError):
    """Wrong format of API-method calling info/"""


class EUnexpectedError(EAPIError):
    """Unexpected internal error while calling API-function"""


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
        except Exception as e:
            log.error('API UNEXPECTED(!) error: %s !-> %r', log_call, e)
            # todo: detail logging unexpected errors
            raise EUnexpectedError(repr(e))

        log.info('API result: %s --> %r', log_call, res)
        return res

    functools.update_wrapper(cover, func)
    cover._public_method = True
    return cover


class API(object):
    """Base API provider class"""
    def __call__(self, method, params):
        if not hasattr(self, method):
            raise EWrongMethodError('API Method {!r} is not supported.'.format(method))

        func = getattr(self, method)

        if not callable(func):
            raise EWrongMethodError('{!r} is not API method.'.format(method))

        if not hasattr(func, '_public_method'):
            raise EWrongMethodError('API Method {!r} is not allowed.'.format(method))

        return func(**params)

    def __rpc_call__(self, message):
        try:
            call_info = tornado.escape.json_decode(message)
        except Exception as e:
            return self._make_respond(
                error=EWrongMethodCallingFormat("Can't parse JSON message {!r}: {!r}".format(message, e)))

        method = call_info.get('call')
        params = call_info.get('params', {})
        uid = call_info.get('uid')
        try:
            result = self(method, params)
        except EAPIError as e:
            return self._make_respond(error=e, uid=uid)
        else:
            return self._make_respond(result=result, uid=uid)

    @staticmethod
    def _make_respond(result=None, error=None, uid=None):
        # todo: check unicode
        data = dict(
            message_type='answer',
            error=dict(cls=type(error).__name__, message=error.message) if error else None,
            result=result,
        )
        if uid is not None:
            data['uid'] = uid
        # todo: serialization error
        return serialize(data)


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
