# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

import sys
import traceback
import functools
# try:
#     from tornado.escape import json_decode  # todo: Need to be abstracted from tornado
# except ImportError as e:
#     log.warning(e)
#     from json import loads as json_decode

import json
from time import time
    

from sublayers_server.model.utils import serialize

from tornado.options import options


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


class ECallFrequencyConstrain(EAPIError):
    """Unexpected internal error while calling API-function"""

class ECallAccessDenied(EAPIError):
    """Calling Denied API-function for agent access level"""


def public_method(func):
    """API public method decorator"""
    def cover(*av, **kw):
        log_call = '{method}({params})'.format(
            method=func.__name__,
            params=', '.join(map(repr, av) + ['{}={!r}'.format(k, v) for k, v in kw.items()]),
        )
        # log.info('API call: %s ...', log_call)
        try:
            res = func(*av, **kw)
        except TypeError as e:
            log.exception('API error: %s !-> %r', log_call, e)
            raise EWrongParamsError(e.message)
        except Exception as e:
            log.error('API UNEXPECTED(!) error: %s !-> %r', log_call, e)
            exc_type, exc_value, exc_traceback = sys.exc_info()
            log.error(''.join(traceback.format_exception(exc_type, exc_value, exc_traceback)))
            # todo: detail logging unexpected errors
            raise EUnexpectedError(repr(e))

        return res

    functools.update_wrapper(cover, func)
    cover._public_method = True
    return cover


def basic_mode(func):
    """ basic_mode method decorator """
    def cover(*av, **kw):
        if options.mode != 'basic':
            return log.warning('Server Mode:{server_mode}. Try to call {method}({params})'.format(
                server_mode=options.mode,
                method=func.__name__,
                params=', '.join(map(repr, av) + ['{}={!r}'.format(k, v) for k, v in kw.items()]),
            ))
        return func(*av, **kw)
    functools.update_wrapper(cover, func)
    return cover


def call_constrains(delay=0):
    """ call frequency constraining decorator """
    def deco(func):
        def cover(self, *av, **kw):
            t = time()
            func_name = func.__name__
            attr_name = '_call_constrains_{}'.format(func_name)
            t0 = getattr(self, attr_name, None)
            if t0 is None or t0 + delay < t:
                setattr(self, attr_name, t)
                return func(self, *av, **kw)
            else:
                # todo: если разница меньше, чем отработал интерфейс на клиенте, то записать агента в нарушители
                raise ECallFrequencyConstrain('{agent} called <{func_name}> too early. Min delay={delay}, prev_call={prev_call}, time={time}'.format(
                    agent=self.agent,
                    func_name=func_name,
                    delay=delay,
                    prev_call=t0,
                    time=t
                ))
        functools.update_wrapper(cover, func)
        return cover
    return deco


def access_level(min_level=0):
    """ call frequency constraining decorator """
    def deco(func):
        def cover(self, *av, **kw):
            func_name = func.__name__
            if self.agent.access_level >= min_level:
                return func(self, *av, **kw)
            else:
                raise ECallAccessDenied('Access Denied for {agent} called <{func_name}>. Agent Level={a_lvl}, min_level={min_level}'.format(
                    agent=self.agent,
                    func_name=func_name,
                    a_lvl=self.agent.access_level,
                    min_level=min_level,
                ))
        functools.update_wrapper(cover, func)
        return cover
    return deco


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
            call_info = json.loads(message, encoding="utf-8")
        except Exception as e:
            msg = "Can't parse JSON message {!r}: {!r}".format(message, e)
            log.error(msg)
            return self._make_respond(
                error=EWrongMethodCallingFormat(msg))

        method = call_info.get('call')
        params = call_info.get('params', {})
        rpc_call_id = call_info.get('rpc_call_id')
        try:
            result = self(method, params)
        except ECallFrequencyConstrain as e:
            log.warning(e)
            # info: говорим на клиент, что всё норм, а сами ничего не сделали
            return self._make_respond(result=True, rpc_call_id=rpc_call_id)
        except ECallAccessDenied as e:
            log.warning(e)
            # info: говорим на клиент, что всё норм, а сами ничего не сделали
            return self._make_respond(result=True, rpc_call_id=rpc_call_id)
        except EAPIError as e:
            return self._make_respond(error=e, rpc_call_id=rpc_call_id)
        else:
            return self._make_respond(result=result, rpc_call_id=rpc_call_id)

    @staticmethod
    def _make_respond(result=None, error=None, rpc_call_id=None):
        # todo: check unicode
        data = dict(
            message_type='answer',
            error=dict(cls=type(error).__name__, message=error.message) if error else None,
            result=result,
        )
        if rpc_call_id is not None:
            data['rpc_call_id'] = rpc_call_id
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
    print(api.f(1, y=2))
    print(api(method='f', params=dict(x=1, y=2)))
