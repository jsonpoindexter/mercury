sudo kilall gpsd
sudo stty -F /dev/ttyAMA0 9600
sudo gpsd /dev/ttyAMA0 -F /var/run/gpsd.sock
cgps