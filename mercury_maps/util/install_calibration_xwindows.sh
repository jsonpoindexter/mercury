#Install all the prerequisites required for calibration
#http://ozzmaker.com/enable-x-windows-on-piscreen/
sudo apt-get install libtool libx11-dev xinput autoconf libx11-dev libxi-dev x11proto-input-dev -y
# Download and install xinput_calibrator
git clone https://github.com/tias/xinput_calibrator
cd xinput_calibrator/
./autogen.sh
make
sudo make install
#Download and setup the calibration script
cd ~
wget http://ozzmaker.com/piscreen/xinput_calibrator_pointercal.sh
sudo cp ~/xinput_calibrator_pointercal.sh /etc/X11/Xsession.d/xinput_calibrator_pointercal.sh
#Open X autostart
nano /home/pi/.config/lxsession/LXDE-pi/autostart
#Add the text below to the bottom of the file;
sudo /bin/sh /etc/X11/Xsession.d/xinput_calibrator_pointercal.sh
#Start X Windows
FRAMEBUFFER=/dev/fb1 startx
#Force X windows to Load to PiScreen Automatically on boot
sudo nano /etc/inittab
Scroll down to one of these lines;
# Older Raspbian images;
1:2345:respawn:/sbin/getty 115200 tty1
# Newer Raspbian images
1:2345:respawn:/sbin/getty –noclear 38400 tty1
# Add a hash in front to comment it out;
#1:2345:respawn:/sbin/getty 115200 tty1
# and add this line right below it;
1:2345:respawn:/bin/login -f pi tty1 /dev/tty1 2>&1
# File two;
 sudo nano /etc/rc.local
 sudo -l pi -c "env FRAMEBUFFER=/dev/fb1 startx &"
 
 sudo nano /etc/X11/Xwrapper.config 
 allowed_users=anybody