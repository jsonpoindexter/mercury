#!/usr/bin/env python2.7
#Set up socket client
from socketIO_client import SocketIO, LoggingNamespace

def sendData(self, payload):
    self.set_payload_length(len(payload))
    base_addr = self.get_fifo_tx_base_addr()
    self.set_fifo_addr_ptr(base_addr)

    self.spi.xfer([REG.LORA.FIFO | 0x80] + payload)[1:]
    self.set_mode(MODE.TX)  # send Payload
    print("send payload:", payload)
    
def on_data(*data):
    print('on_data', data)
    sendData(lora, list(data))
    
    
socketIO = SocketIO('localhost', 3000, LoggingNamespace)
socketIO.on('data', on_data)

""" Ping Class """

""" Thomas Verbeke - thomas.verbeke@vub.ac.be

    Part of the ping-pong implementation
    Tested with Embed LoRa Module (SX1276 Semtech chip)
    Will send a "PING" message and put itself into continous reception mode

    Ping-pong application is based on a fork of the pySX127x by Mayer Analytics Ltd.

"""
import sys
from time import sleep
from SX127x.LoRa import *
from SX127x.board_config import BOARD

BOARD.setup()


class SendData(LoRa):
	#Read data from stdin
    
    def __init__(self, verbose=False):
        super(SendData, self).__init__(verbose)
        self.set_mode(MODE.SLEEP)
        self.set_dio_mapping([0] * 6) #DIO0 is set to RxDone
        #self.set_payload_length(1)

        """ DIO Mapping     DIO5        DIO4        DIO3    DIO2                DIO1        DIO0
                            ModeReady   CadDetected CadDone FhssChangeChannel   RxTimeout   RxDone
        """

    def on_rx_done(self):  # will not be called trough DIO (mapped to TxDone) 
        print("\n(RxDone) Packet Received")
        
        #print(self.get_irq_flags()) 
        #lines = read_in()
        #print('num bytes payload', self.get_rx_nb_bytes())
        
        payload = self.read_payload(nocheck=True)
        print ("payload :", payload)	
        print ("Data from InAir4 received")
        sleep(0.5)
        self.set_dio_mapping([1,0,0,0,0,0]) #DIO0 is set to TxDone
        self.set_mode(MODE.STDBY)
        sleep(0.001)
        self.clear_irq_flag_RxDone() # clear RX interrupt flag
        
        #clear_irq_flags has been depricated following issue # 1
        #self.clear_irq_flags() 
        sys.stdout.flush()
    
        socketIO.emit('data', payload, on_data)
        socketIO.wait_for_callbacks(seconds=0.008)

    def on_tx_done(self):
        print("\n(TxDone) Packet Send")
        #print(self.get_irq_flags())
        print ("Waiting for messages (Cont. Mode)")
        self.set_dio_mapping([0] * 6) #DIO0 is set to RxDone

        #self.set_mode(MODE.SLEEP)  

        sleep(0.001)
        self.clear_irq_flag_TxDone() # clear TX interrupt flag

        self.reset_ptr_rx() 
        self.set_mode(MODE.RXCONT) #put in cont receiver mode

    def on_cad_done(self):
        print("\non_CadDone")
        print(self.get_irq_flags())

    def on_rx_timeout(self): # will not be called in continous mode
        print("\non_RxTimeout")
        print(self.get_irq_flags())

    def on_valid_header(self): #will not be called trough DIO3 (mapped to CadDone)
        print("\non_ValidHeader")
        print(self.get_irq_flags())

    def on_payload_crc_error(self): #will not be called trough DIO3 (mapped to CadDone)
        print("\non_PayloadCrcError")
        print(self.get_irq_flags())

    def on_fhss_change_channel(self): #frequency hopping p32
        print("\non_FhssChangeChannel")
        print(self.get_irq_flags())
    
        
    def start(self):
        self.reset_ptr_rx() # Put in cont. reception mode
        self.set_mode(MODE.RXCONT)
        print ("Waiting for messages (Cont. Mode)")
        while True:
            sleep(0)
            #after timer runs out restart


lora = SendData(verbose=False)
lora.set_mode(MODE.STDBY)
lora.set_pa_config(pa_select=0)


print(lora)
#assert(lora.get_agc_auto_on() == 1)

#try: input("Press enter to start...")
#except: pass

try:
    lora.start()
except KeyboardInterrupt:
    sys.stdout.flush()
    print("")
    sys.stderr.write("KeyboardInterrupt\n")
finally:
    sys.stdout.flush()
    print("")
    lora.set_mode(MODE.SLEEP)
    print(lora)
    BOARD.teardown()
