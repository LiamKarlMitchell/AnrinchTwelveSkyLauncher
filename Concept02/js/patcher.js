var downloader = require('./HTTPFileProgressDownload.js');
var request = require('request');
var checksum = require('checksum');
var fs = require('fs-extra');
var path = require('path');

var Patcher = function(app){
	console.log("Initializing patcher");
	this.concurrentDownloads = 1;
	this.freeConcurrentDownloads = this.concurrentDownloads;
	this.app = app;
	this.fileIntegrityCheckCounter = 0;
	this.invalidFiles = [];
	this.currentFile = 0;
	this.currentFiles = [];
	this.finishedFiles = 0;
}

var States = {
	'INIT': 0,
	'CHECKING_FILE_INTEGRITY': 1,
	'PATCHING': 2,
	'READY': 3,
	'ERROR': 4
};

Patcher.prototype.setState = function(state){
	var self = this;
	switch(state){
		case States.INIT:
		console.log("Patcher: Initializing");

		this.app.ele.status.html('Initializing...');
		request('https://patch.anrinch.com/ts1/patch_info.txt', function(error, response, body){
			if(error){
				console.log(error);
				return;
			}

			if(response.statusCode !== 200){
				console.log("On getting patch info code: " + response.statusCode);
				return;
			}

			self.setState(States.CHECKING_FILE_INTEGRITY);

			var versionFiles = body.split("\n\r");
			self.fileIntegrityCheckCounter = versionFiles.length;

			for(var i=0, length=versionFiles.length; i<length; i++){
				var file = versionFiles[i].trim();
				var fileData = file.split(' ');
				self.checkFileIntegrity(fileData);
			}
		});
		break;

		case States.CHECKING_FILE_INTEGRITY:
		this.app.ele.status.html('Checking file integrity...');
		break;

		case States.PATCHING:
		this.app.ele.status.html('Patching...');
		break;

		case States.READY:
		this.app.ele.status.html('Client is up to date!');
		this.app.ele.play.removeAttr('disabled');
		break;

		case States.ERROR:
		this.app.ele.status.html('Patching failed');
		break;
	}
};

Patcher.prototype.checkFileIntegrity = function(data){
	// Data array contains: 0:file_path 1:checksum
	var filePath = path.resolve(this.app.Paths.Client, data[0]);
	var fileChecksum = data[1];

	var self = this;
	checksum.file(filePath, function(err, sum){
		if(err){
			console.log("Non existing file:", filePath);
			self.invalidFiles.push({filePath: filePath, url: 'https://patch.anrinch.com/ts1/files/' + data[0], progress: 0, index: self.invalidFiles.length});
		}else if(fileChecksum !== sum){
			console.log("Outdated file:", filePath);
			self.invalidFiles.push({filePath: filePath, url: 'https://patch.anrinch.com/ts1/files/' + data[0], progress: 0, index: self.invalidFiles.length});
		}

		if(--self.fileIntegrityCheckCounter === 0) self.beginPatchingOperations();
	});

	console.log("Processing file:", fileChecksum);
};

Patcher.prototype.boot = function(){
	this.setState(States.INIT);
};

Patcher.prototype.beginPatchingOperations = function(){
	this.setState(States.PATCHING);
	if(this.invalidFiles.length === 0){
		this.setState(States.READY);
		this.app.ele.progress.css('width', '100%');
		this.app.ele.minorProgress.css('width', '100%');
	}

	while(this.freeConcurrentDownloads){
		this.freeConcurrentDownloads--;
		var file = this.invalidFiles[this.currentFile];
		if(file){
			this.currentFiles.push(file);
			downloader.pull.call(this, file);
			this.currentFile++;
		}
	}
};

Patcher.prototype.onRender = function(file){
	var total = 0;
	for(var i=0, length=this.invalidFiles.length; i<length; i++){
		var fileProgress = this.invalidFiles[i].progress;
		total += fileProgress;
	}
	total /= this.invalidFiles.length;

	this.app.ele.progress.css('width', total + '%');

	var totalMinor = 0;
	for(var i=0, length=this.currentFiles.length; i<length; i++){
		var fileProgress = this.currentFiles[i].progress;
		totalMinor += fileProgress;
	}

	totalMinor /= this.currentFiles.length;
	this.app.ele.minorProgress.css('width', totalMinor + '%');
};

Patcher.prototype.onSuccess = function(file, tempFile){
	fs.ensureFile(file.filePath, (function(err){
		if(err){
			console.log(err);
			this.setState(States.ERROR);
			return;
		}
		fs.readFile(tempFile, (function(err, buffer){
			if(err){
				console.log(err);
				this.setState(States.ERROR);
				return;
			}

			fs.writeFile(file.filePath, buffer, (function(err){
				if(err){
					console.log(err);
					this.setState(States.ERROR);
					return;
				}


				this.currentFiles.splice(this.currentFiles.indexOf(file), 1);
				this.freeConcurrentDownloads++;
				if(++this.finishedFiles === this.invalidFiles.length){
					this.setState(States.READY);
					return;
				}

				while(this.freeConcurrentDownloads){
					this.freeConcurrentDownloads--;
					var file = this.invalidFiles[this.currentFile];
					if(file){
						this.currentFiles.push(file);
						downloader.pull.call(this, file);
						this.currentFile++;
					}
				}
			}).bind(this));
		}).bind(this));
	}).bind(this));
};

Patcher.prototype.onError = function(err){
	console.log(err);
	this.setState(States.ERROR);
};

module.exports = Patcher
module.exports.States = States;