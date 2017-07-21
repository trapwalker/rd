
cd sublayers_server
python ../kill_process.py sl_quick.pid
python engine_server_quick.py --mode=quick --port=8005 --ws_port=8005 --pidfile=sl_quick.pid $@
