#edit node-app with device ID. IE device id ==1, so "NODE_APP="app.js 1""
sudo nano node-app
#Copy the startup script node-app to your /etc/init.d directory:
cp ./init.d/node-app /etc/init.d/
#Add node-app to the default runlevels:
update-rc.d node-app defaults
#reboot
sudo reboot