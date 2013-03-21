# SFTP Publisher for Punch 

Publish your [Punch](http://laktek.github.com/punch) based sites to any host that provides SFTP access.

### How to Use 

* Install the package
	
		npm install punch-sftp-publisher

* Open your Punch project's configurations (`config.json`) and add the following:

		"plugins": {

			"publishers": {
				"sftp": "punch-sftp-publisher" 
			}

		}

* Also, you must define `publish` settings in the config. 

			"publish" : {
				"strategy" : "sftp",
				"options" : {
						"host" : "hostname",
						"username" : "sftpuser",
						"port" : "22",
						"private_key" : "/home/user/.ssh/id_rsa",
						"upload_path" : "/var/www/"
				}
			}

You must specify server's hostname and your username to login. If you're using a private/public key to authenticate, make sure you specify the explicit full path to the private key (or provide the private key as a string). Files will be uploaded to the remote path specified as upload_path.

* Then, you can publish your site by running `punch publish` (or `punch p`) command.

