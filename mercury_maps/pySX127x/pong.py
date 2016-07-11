#!/usr/bin/env python2.7

""" Pong Class """

""" Thomas Verbeke - thomas.verbeke@vub.ac.be

    Part of the ping-pong implementation
    Tested with Embed LoRa Module (SX1276 Semtech chip)
    Will put LoRa chip into continous reception mode and wait for incoming PONG message

    Ping-pong application is based on a fork of the pySX127x by Mayer Analytics Ltd.
	
"""

from time import sleep
from SX127x.LoRa import *
from SX127x.board_config import BOARD

BOARD.setup()

payload_pong = [0x50, 0x6F, 0x6E, 0x67, 0x67]
payload_ping = [0x50, 0x69, 0x6E, 0x67]

class Pong(LoRa):
    def __init__(self, verbose=False):
        super(Pong, self).__init__(verbose)
        self.set_mode(MODE.SLEEP)
        self.set_dio_mapping([0] * 6) #DIO0 is set to RxDone

        """ DIO Mapping     DIO5        DIO4        DIO3    DIO2                DIO1        DIO0
                            ModeReady   CadDetected CadDone FhssChangeChannel   RxTimeout   RxDone
        """

    def on_rx_done(self):
	print("\n(RxDone) Packet Received")
	
	#print(self.get_irq_flags()) 
	#print('num bytes payload', self.get_rx_nb_bytes())
	payload = self.read_payload(nocheck=True)
	print payload				
	if payload == payload_ping: ## if message is PING [P,i,n,g]/[80, 105, 110, 103] send PONG [P,o,n,g]/[80, 111, 110, 103]
		print "Ping received"
		sleep(0.5) # configure parameter

		self.set_dio_mapping([1,0,0,0,0,0]) #DIO0 is set to TxDone
		self.set_mode(MODE.STDBY)
		sleep(0.001)
		self.clear_irq_flag_RxDone() # clear RX interrupt flag
	        #self.clear_irq_flags()
	        sys.stdout.flush()
	
		self.set_payload_length(len(payload_pong)) # PONG
	        base_addr = self.get_fifo_tx_base_addr()
	        self.set_fifo_addr_ptr(base_addr)
	
		self.spi.xfer([REG.LORA.FIFO | 0x80] + payload_pong)[1:] # SPI call
        	self.set_mode(MODE.TX)  # send PONG

	else: #back in cont. reception mode
		#self.set_mode(MODE.SLEEP)  
		print "Msg not recognised"
	        self.clear_irq_flag_RxDone()  # clear RX interrupt flag
		self.reset_ptr_rx() 
        	self.set_mode(MODE.RXCONT) # go into cont. reception mode
		    

    def on_tx_done(self): # will not be called trough DIO (mapped to RxDone)
	print("\n(TxDone) Packet Send")
        #print(self.get_irq_flags())
	print "Waiting for messages (Cont. Mode)"
	
	self.set_dio_mapping([0] * 6)  #DIO0 is set to RxDone
 	sleep(0.001)
	self.clear_irq_flag_TxDone() # clear TX interrupt flag
	#self.set_mode(MODE.SLEEP)  

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

    def start(self): # Init
        self.reset_ptr_rx() # Put in cont. reception mode
        self.set_mode(MODE.RXCONT)
	print "Waiting for messages (Cont. Mode)"
        while True:
            sleep(.5)
            #rssi_value = self.get_rssi_value()
            #status = self.get_modem_status() #modem clear/header info valid/rx  on-going/signal sync/signal detected
            #sys.stdout.flush()
            #sys.stdout.write("\r%d %d %d" % (rssi_value, status['rx_ongoing'], status['modem_clear']))


lora = Pong(verbose=False)

lora.set_mode(MODE.STDBY)
lora.set_pa_config(pa_select=0)

print(lora)

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

