import asyncio
import sys

queue = asyncio.Queue()

def handle_stdin():
    data = sys.stdin.readline()
    asyncio.async(queue.put(data)) # Queue.put is a coroutine, so you can't call it directly.

@asyncio.coroutine
def tick():
    while 1:
        data = yield from queue.get()
        print('Data received: {}'.format(data))

def main(): 
    loop = asyncio.get_event_loop()
    loop.add_reader(sys.stdin, handle_stdin)
    loop.run_until_complete(tick())    

if __name__ == '__main__':
    main()