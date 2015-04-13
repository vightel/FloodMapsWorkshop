import os
import config

from boto.s3.connection import S3Connection
from boto.s3.key import Key

def CopyToS3( s3_bucket, s3_folder, file_list, force, verbose ):
	aws_access_key 			= os.environ.get('AWS_ACCESSKEYID')
	aws_secret_access_key 	= os.environ.get('AWS_SECRETACCESSKEY')
	
	conn 		= S3Connection(aws_access_key, aws_secret_access_key)
	
	mybucket 	= conn.get_bucket(s3_bucket)
	k 			= Key(mybucket)

	for f in file_list:
		fname	= os.path.basename(f)
		k.key 	= os.path.join(s3_folder, fname)
	
		# Check if it already exists
		possible_key = mybucket.get_key(k.key)
	
		if force or not possible_key:
			if verbose:
				print "storing to s3:", mybucket, k.key
	
			k.set_contents_from_filename(f)
			mybucket.set_acl('public-read', k.key )