
# Client-Server websocket API

Есть два вида взаимодействия между клиентом и сервером:

1. RPC протокол

2. Push-уведомления


## RPC

Вызов клиентом удалённой процедуры осуществляется сообщением вида:

    {
        'call': '<procedure name>',
		'rpc_call_id': <rpc_call_id>,
        'params': {...},
    }

Ответ сервера приходит следующего вида:

    {
        'message_type': 'answer',
		'rpc_call_id': <rpc_call_id>,
        'error': (null|{'cls': '<classname of error>', 'message': '<error message>'}),
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
        'cls': ('ChatMessage'|'see'|'update'|'contact'|'out'),
        'time': <time>,  // точное время события (для корректной отрисовки в случае задержки сигнала)

        # ChatMessage:
        'author': {'cls': <agent_class>, 'uid': <agent_uid>, 'login': '<agent_name>'},
        'text': <message_text>,
        'id': <message_id>,

        # see, contact -- наш юнит увидел объект (при появлении его или нас на карте рядлм), увидели на границе области видимости
        'subject_id': <uid>,  // идентификатор нашего юнита, рапортующего о событии.
        'object': <object>,  // увиденный объект
        
        # update -- событие, говорящее об изменении объекта или его траектории в поле зрения нашего юнита.
        'subject_id': <uid>,
        'object': <object>,  // объект с изменившимися характеристиками или траекторией. Может быть своим собственным объектом, в том числе может быть object.uid == my_unit_id

        # out -- наш юнит перестал видеть объект (это событие носит необязательный характер и введено для упрощения клиента)
        'subject_id': <uid>,
        'object_id': <uid>,
    }
    
	
## procedure name
	fire - сделать залп (по всем в секторе обстрела)
	{
	    'call': 'fire',
		'rpc_call_id': <rpc_call_id>,
        'params': {}
	}
	
	goto - движение в заданные координаты
	{
		'call': 'goto',
		'rpc_call_id': <rpc_call_id>,
        'params': { 'x': <число>, 'y': <число> }
	}

	stop - движение в заданные координаты
	{
		'call': 'stop',
		'rpc_call_id': <rpc_call_id>,
        'params': {}
	}
	
	set_speed - установка скорости для машинки
	{
		'call': 'set_speed',
		'rpc_call_id': <rpc_call_id>,
        'params': { 'new_speed': <число> }
	}
	
	chat_message - отправить сообщение в чат
	{
		'call': 'chat_message'
        'params': { 'text': '<message_text>' }
	}
	
	
## <object>
	{
		'uid' : <uid>,
		'class' : ('car' | 'town' | 'loot'),
		'position' : {'x': <число>, 'y': <число>},
		
        # car
        'subscribe': True | False,  // Признак подписки на события этого юнита. В нашем случае это признак "своей машинки".
        'owner': {'uid': <agent_uid>, 'name': '<agent_name>'},  // Подлежит обсуждению
		
		?'health' : <число>, // присылается лишь в случае изменения ХП машинки
		?'type_car': <число>, // лёгкие=1, средние=2, тяжёлые=3 
		?'circular_motion' : {}
		?'linear_motion' : {
			'velocity' : {'x': <число>, 'y': <число>},
			'acceleration' : {'x': <число>, 'y': <число>},
			'fuel_start': <число>,
			'fuel_decrement': <число>
		}
		// если circular_motion == 'none' и liner_motion == 'none'    - то машинка должна стоять на месте
		// даже если стоит на месте, то должен быть вектор направления машинки
		?'direction' : {'x': <число>, 'y': <число>}  
		
		#town
		
		#loot
		'params': [<loot_object>]
	}
	