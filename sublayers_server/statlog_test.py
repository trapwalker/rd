import logging.config

logging.config.fileConfig("logging.conf")
log = logging.getLogger(__name__)


from collections import OrderedDict


statlog = logging.getLogger('statlog')

d = OrderedDict(
    a=13,
    b=15,
    c='123',
    d='x="13"',
    e='asd;zxc'
)


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


msg = CSV_SPLITTER.join(
    map(prepare_value, d.values())
)

statlog.info(msg, extra=d)

