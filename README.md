menatraining
============

MENA Training to generate flood maps from  Radarsat-2 and Landsat-8 scenes

## Steps

* Create An Amazon web Services (AWS) Account
* Launch a Virtual Machine on Amazon Elastic Compute Cloud (EC2)
  * Select Region East
  * Linux AMI, General Purpose, m3.large
* Create key/pair and store it in your local MENA_DIR.  Restrict access to key.pem (chmod 600 key.pem)
* Remember Instance ID and Public DNS (Check your Management Console if necessary)
* cd $MENA_DIR where key.pem is
* Access your instance: 
  * >ssh -i key.pem ec2-user@<PUBLIC_DNS>
* Install code dependencies:
  * >sh install-deps.sh 
