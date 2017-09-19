# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_common.handlers.base import TimeMeasuredHandler
from sublayers_common.user_profile import User
#from sublayers_common.site_locale import locale

from mongoengine import DoesNotExist
from tornado.web import HTTPError
import uuid


class EmailConfirmHandler(TimeMeasuredHandler):
    SUPPORTED_METHODS = ("GET",)
    _checked_tokens = set()
    # TODO: Проверять авторизацию пользователя, перенаправлять на авторизацию с возвратом на этот хендлер по окончанию
    def get(self, *args, **kwargs):
        token = self.request.query_arguments.get('token', None)
        if not token:
            log.warning('Email confirmation FAIL: no token')
            raise HTTPError(404)

        try:
            token = uuid.UUID(token[0])
        except Exception as e:
            log.warning('Email confirmation FAIL by token {!r}: {}'.format(token, e))
            raise HTTPError(404)

        _checked_tokens = self._checked_tokens
        if token in _checked_tokens:
            log.warning('Email confirmation TRYED AGAIN by token {!r}'.format(token))
            return self.redirect('/')

        _checked_tokens.add(token)
        try:
            user = User.objects.get(auth__standard__email_confirmation_token=token)
        except DoesNotExist as e:
            log.warning('Email confirmation FAIL by token {!r}: {}'.format(token, e))
            raise HTTPError(404)
        except Exception as e:
            log.exception('Error when getting user by email confirmation token: %s', e)
            raise HTTPError(500)

        if not user:
            log.warning('Email confirmation FAIL by token {!r}: user not found'.format(token))
            raise HTTPError(404)

        already_confirmed = user.auth.standard.email_confirmed
        if already_confirmed:
            log.warning('Email RE-confirmation by token {!r} of {}'.format(token, user))
            return self.redirect('/')

        user.auth.standard.email_confirmed = True
        user.save()
        log.info('Email confirmed by token {} of {}'.format(token, user))
        self.redirect('/')
