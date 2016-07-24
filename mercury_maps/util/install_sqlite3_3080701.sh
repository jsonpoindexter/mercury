wget http://www.sqlite.org/src/tarball/SQLite-3b7b72c4.tar.gz?uuid=3b7b72c4685aa5cf5e675c2c47ebec10d9704221 -O SQLite-3b7b72c4.tar.gz
tar xvfz SQLite-3b7b72c4.tar.gz
cd SQLite-3b7b72c4
./configure
make
make install
