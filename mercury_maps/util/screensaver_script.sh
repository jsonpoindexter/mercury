#!/bin/sh
process() {
	while read line; do 
		case "$line" in
			UNBLANK*)
				# Turn on backlight
                echo 0 | sudo tee /sys/class/backlight/*/bl_power
			;;
			BLANK*)
				# Turn off backlight
                echo 1 | sudo tee /sys/class/backlight/*/bl_power
			;;
		esac
	done
}

xscreensaver-command -watch | process