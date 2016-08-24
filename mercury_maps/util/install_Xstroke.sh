#!/bin/sh
sudo apt-get -y install libxft-dev libxpm-dev libxtst-dev
wget http://mirror.egtvedt.no/avr32linux.org/twiki/pub/Main/XStroke/xstroke-0.6.tar.gz
tar xfv xstroke-0.6.tar.gz
cd xstroke-0.6/
./configure