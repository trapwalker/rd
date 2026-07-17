# -*- coding: utf-8 -*-
"""Строковые обёртки над шаблонами tornado.

В Python 3 ``tornado.template.Template.generate`` возвращает ``bytes``
(в py2 возвращал ``str``). Прикладной код проекта подставляет результат
в JSON-сообщения клиенту и в тексты писем, поэтому здесь генерация
возвращает ``str`` (utf-8), как это было в py2.

Патчить tornado глобально нельзя: ``RequestHandler.render`` рассчитывает
именно на ``bytes``.
"""

from tornado import template as _template


class Template(_template.Template):
    def generate(self, **kwargs):
        result = super(Template, self).generate(**kwargs)
        if isinstance(result, bytes):
            result = result.decode('utf-8')
        return result


class Loader(_template.Loader):
    def _create_template(self, name):
        path = _template.os.path.join(self.root, name)
        with open(path, 'rb') as f:
            return Template(f.read(), name=name, loader=self)
