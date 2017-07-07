
cd sublayers_server
python ../kill_process.py sl_basic.pid
python engine_server.py --mode=basic --port=8000 --ws_port=8000 --pidfile=sl_basic.pid $@
