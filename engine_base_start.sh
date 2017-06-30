
cd sublayers_server
python ../kill_process.py sl_base.pid
python engine_server.py --mode=base --port=8000 --ws_port=8000 --pidfile=sl_base.pid $@
