from socketIO_client import SocketIO, LoggingNamespace
from time import sleep
def on_data(*data):
    print('on_data', bytes(data))
    
socketIO = SocketIO('localhost', 3000, LoggingNamespace)

socketIO.on('data', on_data)
socketIO.wait(seconds=1)


