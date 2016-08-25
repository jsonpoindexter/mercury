sudo sfdisk -l
#see partitions and disks
sudo lsblk 
#see sector range
sudo fdisk -l
#see inodes 
df -i
sudo fdisk /dev/mmcblk0
#new part
n
#primary
p
3
13941161
+20G

#select first and last 
#to write
w

sudo reboot
#after reboot x being the partition created
sudo mke2fs /dev/mmcblk0p3 -t ext4 -N 2000000

# mount it mnualls
sudo mkdir /projects
sudo mount /dev/mmcblk0p3 /projects

sudo nano /etc/fstab 
#If you want the partition to mount automatically at boot then you need to add an entry in the /etc/fstab file.
/dev/mmcblk0p3  /projects       ext4    defaults,nofail   0       0

#possbily needsudo 
sudo umount /dev/mmcblk0p3
