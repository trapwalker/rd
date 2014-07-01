
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
        'events': [<event>,...] // пока что на клиенте евент только один, а не список
    }

где <event> -- объект описывающий событие:

    {
        'kind': ('chat_message'|'see'),

        # chat_message:
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
	}
	
	goto - движение в заданные координаты
	{
		'call': 'goto',
        'params': { 'position': {'x': <число>, 'y': <число>}},
	}

	stop - движение в заданные координаты
	{
		'call': 'stop',
        'params': {},
	}
	
	setspeed - установка скорости для машинки
	{
		'call': 'setspeed',
        'params': { 'newspeed': <число>},
	}
	
	chat_message - отправить сообщение в чат
	{
		'call': 'chat_message'
	    'from': <sender_info>, // user.ID
        'text': <message_text>, // текст сообщения
	}
	
	
## <object>
	{
		'uid' : <guid>,
		'class' : ('car' | 'usercar' | 'invisible_object' | 'town' | 'loot'),
		'position' : { 'position': {'x': <число>, 'y': <число>}},
		'server_time' : <UTC на сервере>
		
		#car   #usercar // очень нужно клиенту, чтобы отличать где своя, а где чужая машинки
		?'health' : <число>, // присылается лишь в случае изменения ХП машинки
		?'type_car': <число>, // лёгкие=1, средние=2, тяжёлые=3 
		?'circular_motion' : {}
		?'liner_motion' : {
			'velocity' : {'x': <число>, 'y': <число>},
			'acceleration' : {'x': <число>, 'y': <число>},
			'fuel_start': <число>,
			'fuel_decrement': <число>
		}
		// если circular_motion == 'none' и liner_motion == 'none'    - то машинка должна стоять на месте
		// даже если стоит на месте, то должен быть вектор направления машинки
		?'direction' : {'x': <число>, 'y': <число>}  
		
		#invisible_object // тут ничего не будет, так как нужен только uid, а он уже передан выше
		
		#town
		
		#loot
		'params': [<loot_object>]
	}
	