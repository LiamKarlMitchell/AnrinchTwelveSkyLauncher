var checksum = require('checksum');
var fs = require('fs-extra');
var path = require('path');
var INPUT_FOLDER = path.resolve('./input/');
var OUTPUT_FOLDER = path.resolve('./output/');
var output = [];
var waitingDirectory = {};
var totalWaitingDirectory = 0;
var buffer = '';
var timeout = function(){
	var total = output.length;
	var loaded = 0;

	for(var i=0; i<total; i++){
		checksum.file(output[i], (function(err, sum){
			if(err){
				console.log(err);
			}

			var p = this.file.replace(INPUT_FOLDER, '').substr(1);
			fs.ensureFileSync(path.resolve(OUTPUT_FOLDER, 'files', p));
			fs.writeFileSync(path.resolve(OUTPUT_FOLDER, 'files', p), fs.readFileSync(this.file));
			if(++loaded === total){
				buffer += p + ' ' + sum;
				fs.writeFileSync(path.resolve(OUTPUT_FOLDER, 'patch_info.txt'), buffer);
			}else{
				buffer += p + ' ' + sum + '\n\r';
			}
		}).bind({file: output[i]}));
	}
}

var finishTimeout = setTimeout(timeout, 100);

function readdir(err, items){
	if(err){
		console.log(err);
		return;
	}

	clearTimeout(finishTimeout);

	for(var i=0; i<items.length; i++){
		var item = path.resolve(this.path, items[i]);
		var stat = fs.statSync(item);
		if(stat.isDirectory()){
			fs.readdir(item, readdir.bind({path: item}));
		}
		if(stat.isFile()){
			output.push(item);
		}
	}

	finishTimeout = setTimeout(timeout, 100);
}

// fs.rmdirSync(OUTPUT_FOLDER);
// fs.mkdirSync(OUTPUT_FOLDER);
fs.readdir('./input/', readdir.bind({path: INPUT_FOLDER}));