
import logging

if __name__ == '__main__':
    import log_setup
    log_setup.init()

log = logging.getLogger(__name__)


from collections import OrderedDict


statlog = logging.getLogger('statlog')


CSV_SPLITTER = ';'
CSV_QUOTE = '"'
CSV_ESCAPE = '\\'

def prepare_value(value):
    if not isinstance(value, basestring):
        value = unicode(value)
    
    if {CSV_QUOTE, CSV_ESCAPE} & set(value):
        value = (value
            .replace(CSV_ESCAPE, CSV_ESCAPE + CSV_ESCAPE)
            .replace(CSV_QUOTE, CSV_ESCAPE + CSV_QUOTE)
        )
    if CSV_SPLITTER in value:
        value = ''.join([CSV_QUOTE, value, CSV_QUOTE])
    return value


if __name__ == '__main__':

    d = OrderedDict(
        a=13,
        b=15,
        c='123',
        d='x="13"',
        e='asd;zxc'
    )

    msg = CSV_SPLITTER.join(
        map(prepare_value, d.values())
    )

    statlog.info(msg, extra=d)

