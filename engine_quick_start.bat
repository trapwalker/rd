
call python.bat kill_process.py sublayers_server\sl_quick.pid

cd sublayers_server

rem taskkill /PID 15736 /f
python.bat engine_server.py --mode=quick --port=8005 --ws_port=8005 --pidfile=sl_quick.pid %*
