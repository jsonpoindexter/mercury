#build DB
sqlite3 mercery.db 'DROP TABLE GpsLog;'
sqlite3 mercery.db 'CREATE Table GpsLog( time int, lat int, lon int, alt int, speed int);'