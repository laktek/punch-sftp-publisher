# SFTP Publisher for Punch 

Publish your site to any host that provides SFTP access.

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
            "private_key" : "~/.ssh/id_rsa",
            "upload_path" : "/var/www/"
        }
    }

You must specify server's hostname and your username to login. Files will be uploaded to the remote path specified as upload_path.

Apart from the default options, you can specify any other options that are supported by node-sftp library.

* Then, you can publish your site by running `punch publish` (or `punch p`) command.

