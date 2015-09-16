var path = require('path');
var tmp = require('tmp');
var fs = require('fs');
var https = require('https');

function pull(file) {
	var url = file.url;
	var self = this;
	tmp.file(function _tempFileCreated(err, path, fd, cleanupCallback) {
		if(err){
			self.onError(err, file);
			return;
		}

		var tempFile = fs.createWriteStream(null, {
			fd: fd
		});

		console.log("Pulling file:", url);

		https.get(url, function(res) {
			if(res.statusCode !== 200){
				self.onError(res.statusCode, file);
				return;
			}

			res.pipe(tempFile);

			var totalSize = res.headers['content-length'];
			var pulledSize = 0;

			// If that will slow the rendering, cap it to 100ms update loop
			var lastUpdate = new Date().getTime();
			res.on('data', function(data){
				pulledSize += data.length;
				file.progress = pulledSize / totalSize * 100;
				self.onRender(file);
			});

			res.on('end', function(){
				pulledSize = totalSize;
				file.progress = pulledSize / totalSize * 100;
				self.onRender(file);
				self.onSuccess(file, path);
			});

			res.on('error', function(){
				self.onError(err, file);
			});
		}).on('error', function(err){
			self.onError(err, file);
		});
	});
}

module.exports.pull = pull;