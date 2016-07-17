import SocketServer
class MyTCPServer(SocketServer.ThreadingTCPServer):
    allow_reuse_address = True
class MyTCPServerHandler(SocketServer.BaseRequestHandler):
    def handle(self):
        while 1:
            #print("Received data ... processing")
            #data = self.request.recv(1024).strip()
            data = (self.request.recv(1024).strip())
            if not data:
                break
            #print('data: ',data)
            #Process data
            rstr = (data);
            self.request.sendall(rstr);
if __name__ == '__main__':
    server = MyTCPServer(('127.0.0.1', 4001), MyTCPServerHandler)
    print('started socket server on 127.0.0.1:4001' )
    server.serve_forever()
