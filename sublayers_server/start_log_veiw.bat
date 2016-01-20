
set p=%0
set p=%p:start_log_veiw.bat=%

tail -F %p%log\server.log
