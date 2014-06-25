
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
    }
    

	
## procedure name
	fire - сделать залп (по всем в секторе обстрела)
	{
	    'call': 'fire',
        'params': {},
        'uid': '<guid>' 
	}
	
	goto - движение в заданные координаты
	{
		'call': 'goto',
        'params': { 'position': {'x': <число>, 'y': <число>}},
        'uid': '<guid>' 
	}
	
	setspeed - установка скорости для машинки
	{
		'call': 'setspeed',
        'params': { 'newspeed': <число>},
        'uid': '<guid>' 
	}
	
	
## <object>
	{
		'uid' : <guid>,
		'class' : ('car' | 'town' | 'loot'),
		?'circular_motion' : {}
		?'liner_motion' : {
			'velocity' : {'x': <число>, 'y': <число>},
			'acceleration' : {'x': <число>, 'y': <число>},
			'fuel_start': <число>,
			'fuel_decrement': <число>
			// не забыть, что когда машинка стоит - у неё должно быть направление! даже у стоящей машинки!
		}
		// если circular_motion == 'none' и liner_motion == 'none'    - то машинка должна стоять на месте
		'position' : { 'position': {'x': <число>, 'y': <число>}},
		'server_time' : <UTC на сервере>
	}
	