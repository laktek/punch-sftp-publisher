var _ = require("underscore");
var fs = require("fs");
var path = require("path");
var Sftp = require("sftp.js");
var DeepFstream = require("punch").Utils.DeepFstream;

module.exports = {

	client: null,

	timeoutId: null,

	retrieveOptions: function(supplied_config){
		var error = "Cannot find sftp settings in config";

		if (_.has(supplied_config, "publish") && _.has(supplied_config["publish"], "options")) {
			return supplied_config["publish"]["options"];
		} else {
			throw error;
		}
	},

	isModified: function(modified_date) {
		var self = this;

		return ( modified_date > self.lastPublishedDate	);
	},

	connectToRemote: function(supplied_config, callback){
		var self = this;

		// correct the username
		if(_.has(supplied_config, "username")) {
			supplied_config["user"] = supplied_config["username"];
		};

		// correct the private key
		if(_.has(supplied_config, "private_key")) {
			if(supplied_config["private_key"].indexOf("BEGIN RSA PRIVATE KEY") >= 0) {
				supplied_config["key"] = supplied_config["private_key"];
			} else {
				supplied_config["key"] = fs.readFileSync(supplied_config["private_key"]);
			}
		}

		self.client = new Sftp(supplied_config);
		return self.client.connect(callback);
	},

	checkAndCreateRemoteDirectory: function(remote_dir_path, callback){
		var self = this;

		// check for the directory in remote host
		self.client.ls(remote_dir_path, function(err, stats){
			if(err) {
				// create directory
				self.client.mkdir(remote_dir_path, function(err){
					if (err) {
						throw err;
					}

					// directory created
					// proceed with traversing files in the directory
					return callback();
				});
			}	else {
				// directory exists in remote host
				// proceed with traversing files in the directory
				return callback();
			}
		});
	},

	uploadFile: function(local_path, remote_path, callback){
		var self = this;

		fs.readFile(local_path, function(error, buf){
			if (error) {
				throw error;
			}

			self.client.putData(remote_path, buf, function(err){
				if(err) {
					throw err;
				}

				console.log("saved to %s", remote_path);
				return callback();
			});
		});
	},

	publish: function(supplied_config, last_published_date, complete){

		var self = this;

		var retrieved_options = self.retrieveOptions(supplied_config);
		var upload_path = retrieved_options.upload_path || "./";
		var output_dir = path.join(process.cwd(), supplied_config.output_dir);

		self.lastPublishedDate = last_published_date;

		self.connectToRemote(retrieved_options, function() {

			var file_stream = new DeepFstream(output_dir);

			file_stream.on("directory", function(entry, callback) {
				var remote_dir_path = path.normalize(entry.path.replace(output_dir, upload_path));
				self.checkAndCreateRemoteDirectory(remote_dir_path, callback);
			});

			file_stream.on("file", function(entry, callback) {
				if (self.isModified(entry.props.mtime)) {
					var remote_path = path.normalize(entry.path.replace(output_dir, upload_path));
					self.uploadFile(entry.path, remote_path, callback);
				} else {
					return callback();
				}
			});

			file_stream.on("end", function() {
				self.client.destroy(function() {
					return complete();
				});
			});

		});
	}

};
