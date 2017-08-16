# -*- coding: utf-8 -*-
from __future__ import print_function, absolute_import

import logging
log = logging.getLogger(__name__)

from smtplib import SMTP, SMTPRecipientsRefused
from email.mime.text import MIMEText
from email.utils import make_msgid, formatdate
from tornado.options import options
from ctx_timer import T

import sys
from copy import copy


class TemplateError(Exception): pass


class TemplateRenderError(TemplateError): pass


class EmailSendingError(Exception): pass


class Sender(object):
    def __init__(self, host, port=None, login=None, password=None):
        if port is None:
            try:
                host, port = host.rsplit(':', 1)
            except ValueError:
                raise ValueError('Mail server port is not specified')

        self.host = host
        self.port = port
        self.login =login
        self.password = password
        self._smtp = None

    def open(self):
        smtp = self._smtp
        if smtp is None:
            smtp = self._smtp = SMTP(self.host, self.port)
            smtp.starttls()
            smtp.login(self.login, self.password)

    def close(self):
        smtp = self._smtp
        if smtp is not None:
            self._smtp = None
            try:
                smtp.quit()
            except Exception as e:
                log.exception("Can't quit from smtp client")

    def __enter__(self):
        self.open()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()

    @T()
    def send(self, message):
        smtp = self._smtp
        opened = False
        if smtp is None:
            opened = True
            self.open()

        try:
            result = self._smtp.sendmail(
                from_addr=message.adr_from,
                to_addrs=message.adr_to,
                msg=message.as_rfc_message().as_string(),
            )
            return result
        finally:
            if opened:
                self.close()


class Email(object):
    unique = 'unique-send'

    def __init__(self, text='', subject=None, adr_to=None, adr_from=None, reply_to=None, mime_type='plain', **kw):
        '''
        @param adr_to: send to
        @param adr_from: send from
        @param subject: subject of email
        @param mime_type: plain or html - only minor mime type of 'text/*'
        @param text: text content of email
        '''
        self.text = text
        self.subject = subject
        self.adr_to = adr_to
        self.adr_from = adr_from
        self.mime_type = mime_type
        self.reply_to = reply_to
        #self._extra = kw

    def __unicode__(self):
        return u"{self.__class__.__name__} to: {self.adr_to}, from: {self.adr_from}, sub: {self.subject}".format(self=self)

    def __str__(self):
        return unicode(self).encode(getattr(sys.stdout, 'encoding', None) or 'utf-8', errors='replace')

    def __repr__(self):
        _is_value_compact = lambda rv: len(rv) < 50 and r'\n' not in rv
        return u"<{self.__class__.__name__}({params})".format(
            self=self,
            params=', '.join((
                u'{}={!r}'.format(k, v if _is_value_compact(repr(v)) else '...')
                for k, v in self.__dict__.items()
                if v is not None
            )),
        ).encode(getattr(sys.stdout, 'encoding', None) or 'utf-8', errors='replace')

    def as_rfc_message(self):
        '''
        Creates standardized email with valid header
        '''
        msg = MIMEText(self.text, self.mime_type, 'utf-8')
        msg['Subject'] = self.subject
        msg['From'] = self.adr_from
        msg['To'] = self.adr_to
        msg['Date'] = formatdate()
        msg['Reply-To'] = self.reply_to or self.adr_from
        msg['Message-Id'] = make_msgid(Email.unique)
        return msg

    def send(self, sender=None):
        if sender is None:
            log.wanring(u"FAIL to send {self} because sender is not defined".format(self))
            return
            #raise EmailSendingError("Can't send email")
        return sender.send(self)


class EmailTemplate(object):
    def __init__(self, template=None, subject_template=None, cls=Email, mime_type='plain', **kw):
        self.cls = cls
        self.template = template
        self.subject_template = subject_template
        self._params = kw
        kw['mime_type'] = mime_type

    def _render_template(self, template, **kw):
        try:
            return template.format(**kw)
        except (KeyError, AttributeError, TypeError) as e:
            _msg = 'Template render ERROR({self}): {e}\nTEMPLATE: {template!r}\nCONTEXT: {kw!r}'.format(**locals())
            log.exception(_msg)
            raise TemplateRenderError(_msg)

    def render(self, cls=None, **kw):
        params = self._params.copy()
        params.update(kw)

        #email_params = frozenset(Email.__init__.im_func.func_code.co_varnames[1:])
        if self.template is not None and 'text' not in self._params:
            text = self._render_template(self.template, **params)
        else:
            text = self._params.get('text', '')

        if self.subject_template is not None and 'subject' not in self._params:
            subject = self._render_template(self.subject_template, **params)
        else:
            subject = self._params.get('subject', '')

        params.pop('text', None)
        params.pop('subject', None)
        return (cls or self.cls)(text=text, subject=subject, **params)

    def __call__(self, **kw):
        return self.render(**kw)


email_confirmation_template_ru = EmailTemplate(
    mime_type='html',
    subject=u"Road Dogs - подтвержение регистрации",
    template=u"""
        <body>
            <p>Вас приветствует <a href="{site_proto}://{site}"><b>Road Dogs</b></a> – 
               постъядерная MMORPG в жанре Грабитель/Торговец.</p>
            <p>Ваш адрес {adr_to} был указан при создании персонажа в нашей игре.</p>
            <p>Для подтверждения привязки этой почты к персонажу пройдите по ссылке:
               <a href="{site_proto}://{site}/email_confirm?token={token}">
                        {site_proto}://{site}/email_confirm?token={token}</a></p>
            <p>Если Вы не регистрировались на сайте <a href="{site_proto}://{site}">{site}</a> – 
               проигнорируйте это письмо.</p>
        </body>
    """,
    adr_from='info@roaddogs.ru',
    site_proto='https',
    site='roaddogs.ru',
    confirm_uri='email_confirm?token=',
)

email_confirmation_template_en = EmailTemplate(
    mime_type='html',
    subject=u"Road Dogs - confirmation of registration",
    template=u"""
        <body>
            <p>Welcome to <a href="{site_proto}://{site}"><b>Road Dogs</b></a> - 
               post-nuclear MMORPG in the Privateer/Trader genre.</p>
            <p>Your email address ({adr_to}) was specified when creating a character in our game.</p>            
            <p>To confirm the binding of this email adress to the game character go to: 
               <a href="{site_proto}://{site}/{confirm_uri}{token}">
                        {site_proto}://{site}/{confirm_uri}{token}</a></p>
            <p>If you didn't register on <a href="{site_proto}://{site}">{site}</a>, please ignore this email.</p>
        </body>
    """,
    adr_from='info@roaddogs.ru',
    site_proto='https',
    site='roaddogs.online',
    confirm_uri='email_confirm?token=',
)


SENDER = None

def get_sender(server=None, login=None, password=None):
    global SENDER
    if SENDER:
        return SENDER

    try:
        server = server or options.email_server
        login = login or options.email_login or options.email_from
        password = password or options.email_password
    except AttributeError as e:
        log.error('Cant get email credentals: {}'.format(e))
        #raise e
    else:
        if server:
            SENDER = Sender(host=server, login=login, password=password)
            return SENDER

    if SENDER is None:
        log.warning('Mailing subsystem DISABLEED because service is not configured')


if __name__ == '__main__':
    log = logging.getLogger()
    log.level = logging.DEBUG
    log.addHandler(logging.StreamHandler(sys.stderr))

    from pprint import pprint as pp
    from uuid import uuid4
    import datetime
    et = email_confirmation_template_ru
    get_sender()

    with get_sender(server='smtp.yandex.ru:587', login='info@roaddogs.ru', password='gdvyaavuccekawoj') as sender:
        print(et(adr_to="svpmailbox@gmail.com", token=uuid4().hex).send(sender))
        #print(e.send("SergyP@yandex.ru"))
        #print(e.send("was73r@gmail.com"))

