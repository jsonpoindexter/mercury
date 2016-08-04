#build DB
sqlite3 /projects/mercury/mercury_maps/mercery.db 'DROP TABLE GpsLog;'
sqlite3 /projects/mercury/mercury_maps/mercery.db 'CREATE Table GpsLog( time int, lat int, lon int, alt int, speed int);'