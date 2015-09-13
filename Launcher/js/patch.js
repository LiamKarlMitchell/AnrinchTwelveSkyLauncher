var https = require('https');
var fs = require('fs');
var os = require('os');
var path = require('path');
var extractZip = require('extract-zip');
var async = require('async');
var EventEmitter = require('events');
var HTTPFileProgressDownload = require('./HTTPFileProgressDownload.js');

var CONCURRENT_DOWNLOADS = 4;

function Patch(server) {
	this.server = server;
}

Patch.prototype.getVersions = function Patch_getVersions(callback) {
	var self = this;

	function localVersion(err, data) {
		if (err) {
			data = '0';
		}
		
		// TODO: Apply overide of client and server vesrions here (From command line arguments.)

		self.clientVersion = parseInt(data);
		self.currentVersion = self.clientVersion;
		console.log('Asking ' + self.server.patchURL + ' for server version.');
		console.log('Client version: ' + self.clientVersion);

		var url = self.server.patchURL + '/version.txt';
		console.log(url);;
		https.get(url, function(res) {
			var data = '';
			res.on('data', function(chunk) {
				data += chunk.toString();
			}).on('end', function() {
				self.serverVersion = parseInt(data);
				callback(null, {
					client: self.clientVersion,
					server: self.serverVersion
				});
			});
		}).on('error', function(e) {
			var msg = "Error downloading patch version from " + self.server.patchURL + ".\n" + e.message;
			console.error(msg);
			callback(msg, null);
		});
	}

	fs.readFile('../version.dat', 'utf8', localVersion);
}

Patch.prototype.writeVersion = function Patch_writeVersion(callback) {
	fs.writeFile('../version.dat', this.currentVersion.toString(), 'utf8', callback);
}


// TODO: Patching progress and downloading files required to the tmp dir.
// Following info.txt and doing what it says.
// Updating client side version.txt
// fs.rename to move files.
Patch.prototype.goPatch = function Patch_goPatch(callback) {
	var emitter = new EventEmitter();
	var self = this;
	if (self.clientVersion < self.serverVersion) {
		console.log('some patching to be done.');
		self.currentVersion = self.clientVersion;
	} else if (self.currentVersion > self.serverVersion) {
		console.log('WARNING! Present Version (' + self.currentVersion + ') is higher than Server Version(' + self.serverVersion + ')');
		callback(null, true);
		return emitter;
	} else {
		console.log('Up to date with server.\nPresent Version: ' + self.currentVersion);
		callback(null, true);
		return emitter;
	}

	//   ____      _     ___        __         _____ _ _
	//  / ___| ___| |_  |_ _|_ __  / _| ___   |  ___(_) | ___  ___
	// | |  _ / _ \ __|  | || '_ \| |_ / _ \  | |_  | | |/ _ \/ __|
	// | |_| |  __/ |_   | || | | |  _| (_) | |  _| | | |  __/\__ \
	//  \____|\___|\__| |___|_| |_|_|  \___/  |_|   |_|_|\___||___/
	//  
	// Holds the version: path information for downloaded version info files.
	var versionInfosFinishedDownloading = {};

	// Start version info queue.
	var patchDownloadQueue = async.queue(function(task, infoFileDownloadCallback) {

		function onSuccess(path) {
			versionInfosFinishedDownloading[task.ver] = path;
			infoFileDownloadCallback(null, path);
		}

		function onError(err) {
			console.log('ONERROR');
			infoFileDownloadCallback(err, null);
		}

		var url = self.server.patchURL + '/' + task.ver + '/info.txt';
		var download = new HTTPFileProgressDownload(url, undefined, onSuccess, onError);
		task.download = download;

	}, CONCURRENT_DOWNLOADS);

	var ver = self.currentVersion;
	while (ver < self.serverVersion) {
		patchDownloadQueue.push({
			'ver': ++ver // It is Intentional to increment first and store in queue as +1 as we want to get the next version info.
		}, function _handlePatchInfoDownloadError(err) {
			if (err) {
				self.stopPatching = true;
				callback(err, null);
				//patchDownloadQueue.kill();
				patchDownloadQueue.tasks.length = 0; // Using this because kill is not released yet.
				return;
			}
		});
	}

	self.stopPatching = false;

	// __        ___     _ _     _     ____       _       _       ___        __
	// \ \      / / |__ (_) |___| |_  |  _ \ __ _| |_ ___| |__   |_ _|_ __  / _| ___
	//  \ \ /\ / /| '_ \| | / __| __| | |_) / _` | __/ __| '_ \   | || '_ \| |_ / _ \
	//   \ V  V / | | | | | \__ \ |_  |  __/ (_| | || (__| | | |  | || | | |  _| (_) |
	//    \_/\_/  |_| |_|_|_|___/\__| |_|   \__,_|\__\___|_| |_| |___|_| |_|_|  \___/
	//    
	async.whilst(
		function() {
			if (self.stopPatching) {
				return false;
			}

			if (self.reload) {
				return false;
			}

			console.log(self.currentVersion +' < '+ self.serverVersion);
			return self.currentVersion < self.serverVersion;
		},
		function(processedPatchInfoCallback) {

			// TODO: Improve this to be faster for all downloads. (Download things at the same time but install them in order.)
			// It could be done for 7Zip or get or patch files...

			//   ____                          _    __     __            _               ___        __         ____                      _                 _          _ ___
			//  / ___|   _ _ __ _ __ ___ _ __ | |_  \ \   / /__ _ __ ___(_) ___  _ __   |_ _|_ __  / _| ___   |  _ \  _____      ___ __ | | ___   __ _  __| | ___  __| |__ \
			// | |  | | | | '__| '__/ _ \ '_ \| __|  \ \ / / _ \ '__/ __| |/ _ \| '_ \   | || '_ \| |_ / _ \  | | | |/ _ \ \ /\ / / '_ \| |/ _ \ / _` |/ _` |/ _ \/ _` | / /
			// | |__| |_| | |  | | |  __/ | | | |_    \ V /  __/ |  \__ \ | (_) | | | |  | || | | |  _| (_) | | |_| | (_) \ V  V /| | | | | (_) | (_| | (_| |  __/ (_| ||_|
			//  \____\__,_|_|  |_|  \___|_| |_|\__|    \_/ \___|_|  |___/_|\___/|_| |_| |___|_| |_|_|  \___/  |____/ \___/ \_/\_/ |_| |_|_|\___/ \__,_|\__,_|\___|\__,_|(_)
			//
			var patchVersion = self.currentVersion + 1;
			console.log('Patching to '+patchVersion);
			console.log(patchVersion, versionInfosFinishedDownloading);
			if (versionInfosFinishedDownloading[patchVersion] !== undefined) {
				console.log('Processing Patch: ' + patchVersion);
				emitter.emit('readingInfo', patchVersion);

				fs.readFile(versionInfosFinishedDownloading[patchVersion], 'utf8', function(err, data) {
					if (err) {
						console.log('Error reading patch file: ' + err.message);
						stopPatching = true;
						return processedPatchInfoCallback(err);
					}


					var instructions = data.split(/\r?\n/);
					var record_count = 0;
					console.log('Instructions for ' + patchVersion);
					console.log(instructions);


					// 	 ___                          ____       _       _       ___           _                   _   _
					//  / _ \ _   _  ___ _   _  ___  |  _ \ __ _| |_ ___| |__   |_ _|_ __  ___| |_ _ __ _   _  ___| |_(_) ___  _ __  ___
					// | | | | | | |/ _ \ | | |/ _ \ | |_) / _` | __/ __| '_ \   | || '_ \/ __| __| '__| | | |/ __| __| |/ _ \| '_ \/ __|
					// | |_| | |_| |  __/ |_| |  __/ |  __/ (_| | || (__| | | |  | || | | \__ \ |_| |  | |_| | (__| |_| | (_) | | | \__ \
					//  \__\_\\__,_|\___|\__,_|\___| |_|   \__,_|\__\___|_| |_| |___|_| |_|___/\__|_|   \__,_|\___|\__|_|\___/|_| |_|___/
					//
					var patchTaskQueue = async.queue(function(instruction, patchTaskQueueCallback) {
						var arr;

						if (self.stopPatching) {
							return patchTaskQueueCallback(new Error('Stopping...'), null);
						}

						// 	   _    _           _
						//    / \  | | ___ _ __| |_
						//   / _ \ | |/ _ \ '__| __|
						//  / ___ \| |  __/ |  | |_
						// /_/   \_\_|\___|_|   \__|
						//
						arr = /^alert (.*)$/.exec(instruction);
						if (arr !== null) {
							emitter.emit('alert', arr[1]);
							patchTaskQueueCallback(null);
							return;
						}

						//   ________ ____
						//  |__  /_ _|  _ \
						//    / / | || |_) |
						//   / /_ | ||  __/
						//  /____|___|_|
						//
						arr = /^zip ([-a-zA-Z0-9@:%_\+.~#?&=\/]*)\s?(.+)?$/.exec(instruction);
						if (arr !== null) {
							// Inded 1 is URL index 3 is file path which is optional.
							// TODO put in download queue.
							var url = self.server.patchURL + '/' + patchVersion + '/' + arr[1];
							var location = arr[2];

							function onSuccess(path) {
								// TODO: What is requried.

								// If the location is set to - then we want to only use it to quickly pull files from.
								// If the location is not defined or is a . then we want to extract the contents into the game directory and overwrite what is there.
								if (location === undefined || location === '.') {
									emitter.emit('extracting', path);


									//  ____      _    _   _ _____ _
									// |  _ \    / \  | \ | |_   _| |
									// | |_) |  / _ \ |  \| | | | | |
									// |  _ <  / ___ \| |\  | | | |_|
									// |_| \_\/_/   \_\_| \_| |_| (_)

									/// It turns out extracting files from an archive and getting progress is somewhat difficult... no good modules seem to exist.
									/// I will have to code one or use a different format.
									/// 
								    // TEMP lets just say we did everything..
									//patchTaskQueueCallback(null);
									//return patchTaskQueueCallback(new Error('FUCK'));
									extractZip(path, { dir: '../' }, function(err) {
										console.log('extracted', err);
										patchTaskQueueCallback(err);
									});

									// zip = new AdmZip(path);
									// zipEntries = zip.getEntries(); // an array of ZipEntry records
									// try {
									// 	zip = new AdmZip(path);
									// 	zipEntries = zip.getEntries(); // an array of ZipEntry records
									// 	console.log(zipEntries);
									// 	zip.extractAllToAsync('../', true, function() {
									// 		emitter.emit('extracted');
									// 		processedPatchInfoCallback(null, true);
									// 	});
									// } catch (err) {
									// 	processedPatchInfoCallback(err);
									// }
									// var myTask = new Zip();
									// myTask.extractFull(path, '../', {
									// 	wildcards: ['*'],
									// 	r: true
									// })
									// .progress(function(files) { // Progress of files that have been extracted already.
									// 	console.log('Some files are extracted: %s', files);
									// 	emitter.emit('zipProgress', files);
									// })
									// .then(function() { // When all is done 
									// 	console.log('Extracting done!');
									// 	emitter.emit('extracted', true);
									// 	patchTaskQueueCallback(null, true);
									// })
									// .catch(function(err) { // On error 
									// 	patchTaskQueueCallback(err);
									// });

								} else {
									return patchTaskQueueCallback(new Error('Unhandled location type specified for 7zip download.'));
								}
							}

							function onError(err) {
								if (err) {
									patchTaskQueueCallback(err);
								}
							}

							function onRender(stats) {
								emitter.emit('render', {
									stats: stats,
									url: url,
									download: download,
									bar: download.bar
								});
							}

							var download = new HTTPFileProgressDownload(url, onRender, onSuccess, onError);
							instruction.download = download;
							return;
						}

						//  ____  _____ _     ___    _    ____
						// |  _ \| ____| |   / _ \  / \  |  _ \
						// | |_) |  _| | |  | | | |/ _ \ | | | |
						// |  _ <| |___| |__| |_| / ___ \| |_| |
						// |_| \_\_____|_____\___/_/   \_\____/
						//
						if (instruction === 'reload') {
							emitter.emit('reload', true);
							self.reload = true;
							patchTaskQueueCallback(null);
							return;
						}


						//  _ __ _ __ ___
						// | '__| '_ ` _ \
						// | |  | | | | | |
						// |_|  |_| |_| |_|
						//
						arr = /^rm ([\.\\A-Za-z0-9_ ]+)$/.exec(instruction);
						if (arr !== null) {
							var filepath = path.join('../', arr[1]);
							console.log('Removing file: '+arr[1]);
							fs.unlink(filepath, patchTaskQueueCallback);
							return;
						}

						console.log('TODO: Code handling of this instruction: ' + instruction);
						patchTaskQueueCallback(new Error('Aborting Patching '+patchVersion+' the following instruction is not recognized: '+instruction+' Launcher may be out of date.'));
						return;
					});


					// Put the instructions into the queue.
					for (var i = 0; i < instructions.length; i++) {
						console.log('#' + i + ' ' + instructions[i]);
						patchTaskQueue.push(instructions[i], function _patchQueueErr(err) {
							if (err) {
								console.log('Error with patch task: ' + err.message);
								if (!self.stopPatching) {
									patchTaskQueue.tasks.length = 0;
									self.stopPatching = true;
									processedPatchInfoCallback(err);
									return false;
								}
							}
						});
					}

					patchTaskQueue.drain = function _patchTaskQueueDrained() {
						if (!self.stopPatching) {
							console.log('All patch items have been processed.');
							self.currentVersion++;
							self.writeVersion();
							processedPatchInfoCallback(null, true);
						}
					};

				});
			} else {
				emitter.emit('waitingForInfo', patchVersion);
				// We don't have a patch info file for the current version so we will continue to wait.
				// Check again in a second.
				console.log('waitingForInfo', patchVersion);
				setTimeout(processedPatchInfoCallback, 1000);
			}

		},
		function(err) {
			console.log('Patching process completed.');
			// Return result if completed patching or not.
			callback(err, self.currentVersion === self.serverVersion);
		});
	return emitter;
}

module.exports = Patch;