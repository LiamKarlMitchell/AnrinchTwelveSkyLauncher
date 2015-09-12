// Allows you to get progress.
var statusBar = require('status-bar');
var path = require('path');
var tmp = require('tmp');
var fs = require('fs');
var https = require('https');

// Intended to do nothing.
function NOP() {};

tmp.setGracefulCleanup();

function HTTPFileProgressDownload(url, onRender, onSuccess, onError) {
	var self = this;
	if (url === undefined || url === '') {
		return new Error('Please specify a URL for HTTPFileProgressDownload to download.');
	}

	self.url = url;
	self.basename = path.basename(self.url);

	if (onRender === undefined) {
		onRender = function _defaultRender(stats) {
			console.log(
				self.basename + ' ' +
				this.format.storage(stats.currentSize) + ' ' +
				this.format.speed(stats.speed) + ' ' +
				this.format.time(stats.elapsedTime) + ' ' +
				this.format.time(stats.remainingTime) + ' [' +
				this.format.progressBar(stats.percentage) + '] ' +
				this.format.percentage(stats.percentage)
			);
		}
	}

	if (onSuccess === undefined) {
		onSuccess = NOP;
	}

	if (onError === undefined) {
		onError == NOP;
	}

	tmp.file(function _tempFileCreated(err, path, fd, cleanupCallback) {
		if (err) {
			console.error('Problem creating temp file.');
			onError(err);
			return;
		}

		self.path = path;

		var ws = fs.createWriteStream(null, {
			fd: fd
		});
		var errorSent = false;
		https.get(url, function(res) {
			console.log('RES fired for '+url+' statusCode: '+res.statusCode);
			switch (res.statusCode) {
				case 200:
				if (res.headers['content-length'] === undefined) {
					errorSent = true;
					onError.call(self, new Error('content-length not found for the download of '+url+'.'));
					return;
				}
				console.log('HTTPFileProgressDownload '+url);
				self.bar = statusBar.create({
					total: res.headers['content-length']
				}).on('render', onRender);

				res.pipe(ws);
				res.pipe(self.bar);

				res.on('end', function(){
					//setTimeout(function() { // Wait a brief amount to see if it fixes problem i was having accessing file fast after it downloaded.
						onSuccess.call(self, self.path);
					//}, 10);
				});
				break;
				case 500:
				errorSent = true;
				return onError.call(self, new Error('Server Error whilst downloading '+url+'.'));
				break;
				case 404:
				errorSent = true;
				return onError.call(self, new Error('404 File not found '+url+'.'));
				break;
				default:
				errorSent = true;
				return onError.call(self, new Error('Status code: '+res.statusCode+' when 200 is expected, whilst trying to download '+url+'.'));
				break;
			}
		}).on('error', function(err) {
			console.log('httpd error ',err); // TODO: Figure out why this fires twice if file not found.
			if (self.bar) self.bar.cancel();
			if (errorSent === false) {
				errorSent = true;
				var msg = "Error downloading " + self.url + ': ' + err.message;
				onError.call(self, new Error(err));
				cleanupCallback();
			}
		});

	});

}

module.exports = HTTPFileProgressDownload;