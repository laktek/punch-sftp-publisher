var fs = require("fs");
var sftp_publisher = require("../lib/sftp.js");
var Sftp = require("sftp.js");

describe("calling publish", function() {

	it("should retrieve sftp options from the config", function(){

		var supplied_config = {"output_dir": "path/output_dir"};

		spyOn(sftp_publisher, "retrieveOptions").andReturn({"upload_path": "public_html/site"});
		spyOn(sftp_publisher, "connectToRemote");

		sftp_publisher.publish(supplied_config);

		expect(sftp_publisher.retrieveOptions).toHaveBeenCalledWith(supplied_config);

	});

	it("should initiate the connection to remote host", function(){

		var supplied_config = {"output_dir": "path/output_dir"};

		spyOn(sftp_publisher, "retrieveOptions").andReturn({"upload_path": "public_html/site"});
		spyOn(sftp_publisher, "connectToRemote");

		sftp_publisher.publish(supplied_config);

		expect(sftp_publisher.connectToRemote).toHaveBeenCalled();

	});

});

describe("retrieve the sftp options from the config", function() {

	it("returns the sftp options defined in publish section of config", function(){

		var sftp_config = {"username": "mike", "password": "mike1324"};
		var supplied_config = {"publish": { "strategy": "sftp", "options": sftp_config }};

		expect(sftp_publisher.retrieveOptions(supplied_config)).toEqual(sftp_config);

	});

	it("throws an error if config doesn't contain options for sftp", function(){

		var supplied_config = {"publish": { }};
		var error = "Cannot find sftp settings in config";

		expect(function(){ sftp_publisher.retrieveOptions(supplied_config) }).toThrow(error);

	});

	it("throws an error if config doesn't define a publish section", function(){

		var supplied_config = {};
		var error = "Cannot find sftp settings in config";

		expect(function(){ sftp_publisher.retrieveOptions(supplied_config) }).toThrow(error);

	});

});

describe("connect to remote server", function() {

	it("assign private key given as a string", function() {
		var private_key = "-----BEGIN RSA PRIVATE KEY-----\nProc-Type: 4,ENCRYPTED...";
		var supplied_config = { "private_key": private_key };

		sftp_publisher.connectToRemote(supplied_config);
		expect(sftp_publisher.client.key).toEqual(private_key);
	});

	it("read and assign private key given as a file path", function() {
		var private_key = "-----BEGIN RSA PRIVATE KEY-----\nProc-Type: 4,ENCRYPTED...";
		var private_key_path = "~/.ssh/id_rsa";
		var supplied_config = { "private_key": private_key_path };

		spyOn(fs, "readFileSync").andReturn(private_key);

		sftp_publisher.connectToRemote(supplied_config);
		expect(sftp_publisher.client.key).toEqual(private_key);
	});

});

describe("check if a file is modified", function() {

	it("return true if file modified date is newer than last published date", function() {
		sftp_publisher.lastPublishedDate = new Date(2012, 6, 25);

		expect(sftp_publisher.isModified(new Date(2012, 6, 30))).toEqual(true);
	});

});

describe("check and create a remote directory", function(){

	it("takes the stat for the remote directory", function(){
		var spy_ls = jasmine.createSpy();
		var spy_callback = jasmine.createSpy();
		sftp_publisher.client = {ls: spy_ls};

		sftp_publisher.checkAndCreateRemoteDirectory("public_html/site", spy_callback);
		expect(spy_ls).toHaveBeenCalled();
	});

	it("executes the callback if remote directory already exists", function(){
		var spy_ls = jasmine.createSpy();
		spy_ls.andCallFake(function(path, cbk){
			cbk(null, []);
		});
		var spy_callback = jasmine.createSpy();
		sftp_publisher.client = {ls: spy_ls};

		sftp_publisher.checkAndCreateRemoteDirectory("public_html/site", spy_callback);
		expect(spy_callback).toHaveBeenCalled();
	});

	it("creates a remote directory if it doesn't exists", function(){
		var spy_ls = jasmine.createSpy();
		spy_ls.andCallFake(function(path, cbk){
			cbk("error", null);
		});
		var spy_mkdir = jasmine.createSpy();
		var spy_callback = jasmine.createSpy();
		sftp_publisher.client = {ls: spy_ls, mkdir: spy_mkdir};

		sftp_publisher.checkAndCreateRemoteDirectory("public_html/site", spy_callback);
		expect(spy_mkdir.mostRecentCall.args[0]).toEqual("public_html/site");
	});

	it("executes the callback after creating the remote directory", function(){
		var spy_ls = jasmine.createSpy();
		spy_ls.andCallFake(function(path, cbk){
			cbk("error", null);
		});
		var spy_mkdir = jasmine.createSpy();
		spy_mkdir.andCallFake(function(path, cbk){
			cbk();
		});
		var spy_callback = jasmine.createSpy();
		sftp_publisher.client = {ls: spy_ls, mkdir: spy_mkdir};

		sftp_publisher.checkAndCreateRemoteDirectory("public_html/site", spy_callback);
		expect(spy_callback).toHaveBeenCalled();
	});

	it("throws an exception if there's an error in creating the remote directory", function(){
		var spy_ls = jasmine.createSpy();
		spy_ls.andCallFake(function(path, cbk){
			cbk("error", null);
		});
		var spy_mkdir = jasmine.createSpy();
		spy_mkdir.andCallFake(function(path, mode, cbk){
			cbk("error");
		});
		var spy_callback = jasmine.createSpy();
		sftp_publisher.client = {ls: spy_ls, mkdir: spy_mkdir};

		expect(function(){sftp_publisher.checkAndCreateRemoteDirectory("public_html/site", spy_callback)}).toThrow();
	});

});

describe("upload file", function() {

	it("reads the file in given path", function(){
		spyOn(fs, "readFile");
		var spy_callback = jasmine.createSpy();

		sftp_publisher.uploadFile("output/file", "public_html/site", spy_callback);
		expect(fs.readFile.mostRecentCall.args[0]).toEqual("output/file");
	});

	it("writes the file to the given remote path", function(){
		spyOn(fs, "readFile").andCallFake(function(path, callback){
			callback(null, "content");
		});
		var spy_putdata = jasmine.createSpy();
		var spy_callback = jasmine.createSpy();
		sftp_publisher.client = {putData: spy_putdata};

		sftp_publisher.uploadFile("output/file", "public_html/site", spy_callback);
		expect(spy_putdata.mostRecentCall.args[0]).toEqual("public_html/site");
	});

  it("sets the file permissions to 0755", function(){
		spyOn(fs, "readFile").andCallFake(function(path, callback){
			callback(null, "content");
		});
		var spy_putdata = jasmine.createSpy()
		spy_putdata.andCallFake(function(path, buffer, callback){
			callback(null);
    });
    var spy_chmod = jasmine.createSpy();
		var spy_callback = jasmine.createSpy();
		sftp_publisher.client = {putData: spy_putdata, chmod: spy_chmod};

		sftp_publisher.uploadFile("output/file", "public_html/site", spy_callback);
		expect(spy_chmod).toHaveBeenCalledWith("0755", "public_html/site", jasmine.any(Function));
  });

	it("executes the callback after writing the file", function(){
		spyOn(fs, "readFile").andCallFake(function(path, callback){
			callback(null, "content");
		});
		var spy_putdata = jasmine.createSpy();
		spy_putdata.andCallFake(function(path, buffer, callback){
			callback(null);
		});
    var spy_chmod = jasmine.createSpy();
    spy_chmod.andCallFake(function(permission, path, callback){
			callback(null);
		});
		var spy_callback = jasmine.createSpy();
		sftp_publisher.client = {putData: spy_putdata, chmod: spy_chmod};

		sftp_publisher.uploadFile("output/file", "public_html/site", spy_callback);
		expect(spy_callback).toHaveBeenCalled();
	});

	it("throws an exception if there's an error in writing the file", function(){
		spyOn(fs, "readFile").andCallFake(function(path, callback){
			callback(null, "content");
		});
		var spy_putdata = jasmine.createSpy();
		spy_putdata.andCallFake(function(path, buffer, callback){
			callback("error");
		});
		var spy_callback = jasmine.createSpy();
		sftp_publisher.client = {putData: spy_putdata};

		expect(function(){ sftp_publisher.uploadFile("output/file", "public_html/site", spy_callback)	}).toThrow();
	});

  it("throws an exception if there's an error in setting file permission'", function(){
		spyOn(fs, "readFile").andCallFake(function(path, callback){
			callback(null, "content");
		});
		var spy_putdata = jasmine.createSpy()
    spy_putdata.andCallFake(function(path, callback){
			callback(null);
    });
    var spy_chmod = jasmine.createSpy();
    spy_chmod.andCallFake(function(permission, path, callback){
			callback("error");
		});
		var spy_callback = jasmine.createSpy();
		sftp_publisher.client = {putData: spy_putdata, chmod: spy_chmod};

		expect(function(){ sftp_publisher.uploadFile("output/file", "public_html/site", spy_callback)	}).toThrow();
  });

});
