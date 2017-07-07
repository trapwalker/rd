
call python.bat kill_process.py sublayers_server\sl_engine.pid

cd sublayers_server

rem taskkill /PID 15736 /f
python.bat engine_server.py --port=8000 --ws_port=8000 --mode=basic %*
