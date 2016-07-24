curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.31.3/install.sh | bash
echo 'export NVM_DIR=~/.nvm' >>~/.bash_profile
echo 'source ~/.nvm/nvm.sh' >>~/.bash_profile
nvm install v0.10.29 
nvm use v0.10.29
n=$(which node);n=${n%/bin/node}; chmod -R 755 $n/bin/*; sudo cp -r $n/{bin,lib,share} /usr/local