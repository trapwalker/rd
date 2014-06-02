
# Client-Server websocket API

Есть два вида взаимодействия между клиентом и сервером:

1. RPC протокол

2. Push-уведомления


## RPC

Вызов клиентом удалённой процедуры осуществляется сообщением вида:

    {
        'call': '<procedure name>',
        'params': {...},
        'uid': '<message UID>'
    }

Ответ сервера приходит следующего вида:

    {
        'message_type': 'answer',
        'error': (null|{'code': 12345, 'title': '<title of error message>', 'message': '<error message>', 'details': (null|'<details>'}),
        'uid': '<message UID>',
        'result': <result>
    }


## Push-уведомления:

Push-уведомление с сервера имеет вид:

    {
        'message_type': 'push',
        'events': [<event>,...]
    }

где <event> -- объект описывающий событие:

    {
        'kind': ('message'|'see'),

        # message:
        'from': <sender_info>,
        'text': <message_text>,
        'id': <message_id>,

        # see
        'object': <object>,
        'trajectory': <trajectory>,
    }
    


