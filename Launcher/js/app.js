// Load native UI library
var gui = require('nw.gui');
// Get the current window
var win = gui.Window.get();
win.show();
require('nw.gui').Window.get().showDevTools();
var fs = require('fs');
var path = require('path');
var child_process = require('child_process');
var dns = require('dns');
var injector = require("nodeinjector");
var twelveSkyDirectory = path.join(process.cwd(), '../');
var configFile = twelveSkyDirectory + 'config.json';
var customServers = twelveSkyDirectory + 'custom_servers.json';
var HTTPFileProgressDownload = require('./js/HTTPFileProgressDownload.js');
var Patch = require('./js/patch.js');
var config = {};

GRAPHICS_RESOLUTION_X = 1024;
GRAPHICS_RESOLUTION_Y = 768;
GRAPHICS_DEFAULT_FULLSCREEN = true;
if (localStorage.graphics === undefined) {
  localStorage.graphics = {
    resolution_x: GRAPHICS_RESOLUTION_X,
    resolution_y: GRAPHICS_RESOLUTION_Y,
    fullscreen: GRAPHICS_DEFAULT_FULLSCREEN
  };
}

var server = {
  name: 'Anrinch - Global',
  patchURL: 'https://patch.anrinch.com/ts1',
  gameHost: 'ts1.anrinch.com'
};

$('.server .server_name').text(server.name);


function restartApplication() {
  var child;
  var child_process = require("child_process");

  if (process.platform == "darwin") {
    child = child_process.spawn("open", ["-n", "-a", process.execPath.match(/^([^\0]+?\.app)\//)[1]], {
      detached: true
    });
  } else {
    child = child_process.spawn(process.execPath, [], {
      detached: true
    });
  }
  child.unref();
  win.hide();
  gui.App.quit();
}

var Ping = require('ping-wrapper');
Ping.configure();

function pingServerIP(uuid, ip) {
  var ping = new Ping(ip);
  var count = 0;
  var maxCount = 4;
  ping.on('ping', function(data) {
    console.log('Ping %s %s %s: time: %s ms', uuid, ip, data.host, data.time);
    count++;
    var $serverInfo = $('#_' + uuid);
    $serverInfo.find('.ms').text(data.time);
    if (count > 4) {
      ping.stop();
    }
  });
  ping.on('fail', function(data) {
    if (count > maxCount) {
      ping.stop();
    }
    console.log('Fail', data);
  });
}

$(document).ready(function() {
  win.show();
  // Setup buttons
  $('.debug').click(function() {
    win.showDevTools();
  });
  $('.exit').click(function() {
    win.close();
  });
  $('.launch').click(btnLaunchGame_Clicked);
  $('#btnLogin').click(login);
  $('#signin').submit(login);
  $('.content_area .content').hide();
  $('.content.login').show();
  // Disable start game button untill Launcher finishes patching process.
  $('.launch').prop('disabled', true);
  win.on('close', function() {
    //this.hide(); // Pretend to be closed already
    // TODO Stop transfers & let last patch extract? As to not break any files?
    this.close(true);
  });

  process.on('uncaughtException', function(exception) {
    win.show();
    win.showDevTools();
    if (exception.stack) {
      console.error(exception.stack);
    }
  });

  //
  // fs.exists(configFile, function (exists) {
  //   if (exists) {
  //     config = require(configFile);
  //     doPatches();
  //   } else {
  //     alert(configFile+' not found.');
  //     gui.App.quit();
  //   }
  // });
  //
  // var Ping = require('ping-wrapper');
  // Ping.configure();
  //
  // var ping = new Ping('127.0.0.1');
  //
  // var count = 0;
  // ping.on('ping', function(data){
  //     console.log('Ping %s: time: %s ms', data.host, data.time);
  //     count ++;
  //
  //     if (count > 10) {
  //       ping.stop();
  //     }
  // });
  //
  // ping.on('fail', function(data){
  //     console.log('Fail', data);
  // });
  //
  // function doPatches() {
  //
  // }
  // var bgm_path = '../G03_GDATA/D11_WORLDBGM/';
  // var songs = [{ id: 'Z000.BGM', name: 'Server Select' },
  //              { id: 'Z001.BGM', name: 'Draw the sword' },
  //              { id: 'Z002.BGM', name: '' },
  //              { id: 'Z003.BGM', name: '' },
  //              { id: 'Z004.BGM', name: '' },
  //              { id: 'Z005.BGM', name: 'Burn! your soul' },
  //              { id: 'Z006.BGM', name: 'Battlefield' },
  //              { id: 'Z007.BGM', name: 'No easy way out' },
  //              { id: 'Z008.BGM', name: '' },
  //              { id: 'Z011.BGM', name: '' },
  //              { id: 'Z037.BGM', name: 'Enemies on every side' },
  //              { id: 'Z038.BGM', name: '' },
  //              { id: 'Z043.BGM', name: '' },
  //              { id: 'Z055.BGM', name: 'Beoho Mountain' },
  //              { id: 'Z081.BGM', name: '' },
  //              { id: 'Z091.BGM', name: '' },
  //              { id: 'Z143.BGM', name: '' }];
  //var username = '';
  //var password = '';
  var isLoggedIn = false;

  function handle_rememberme() {
    if ($('#rememberme').is(':checked')) {
      localStorage.username = $('#txtUsername').val();
    } else {
      delete localStorage.username;
    }
  };

  // Set the username if remebered.
  $('#rememberme').change(handle_rememberme);
  if (localStorage.username) {
    username = localStorage.username;
    $('#txtUsername').val(username);
  }

  function btnLaunchGame_Clicked() {
    handle_rememberme();
    var current_directory = process.cwd()
    try {
      process.chdir("../");
      if (injector.executeInject("TwelveSky.exe /_AEnt12/" + (localStorage.graphics.fullscreen ? 3 : 2) + "/" + (localStorage.graphics.resolution_x || 1024) + "/" + (localStorage.graphics.resolution_y || 768), "TS1_Client.dll")) {
        console.log('Process started and injected.');
      } else {
        console.log('Unable to execute and inject dll.');
      }
    } catch (err) {
      console.error('Exception Thrown!');
      console.error(err);
    }
    process.chdir(current_directory)
  }
  var $progressBar1 = $('.progress .first');
  var $progressBar2 = $('.progress .second');
  var isFinishedPatching = false;

  function patchingCompleted() {
    $progressBar1.prop('value', $progressBar1.prop('max'));
    $progressBar2.prop('value', $progressBar2.prop('max'));
    isFinishedPatching = true;

    $('#lblStatus').text('Patching Completed');
    if (isLoggedIn) {
      $('#btnLaunchText').text('LAUNCH GAME');
      $('.launch').removeProp('disabled');
    } else {
      $('#btnLaunchText').text('LOGIN REQUIRED');
    }
  }

  var patcher = new Patch(server);

  function goPatchResult(err, isUpToDate) {
    var $lblStatus = $('#lblStatus');
    if (err) {
      $lblStatus.text('Error Patching: ' + err.message);
      console.error(err);
      alert('Error Patching: ' + err.message);
      return;
    }

    if (patcher.reload) {
      $lblStatus.text('Reloading Launcher in 3.');
      setTimeout(function() {
        $lblStatus.text('Reloading Launcher in 2.');
        setTimeout(function() {
          $lblStatus.text('Reloading Launcher in 1.');
          setTimeout(function() {
            restartApplication();
          }, 1000);
        }, 1000);
      }, 1000);
      return;
    }

    if (isUpToDate) {
      isLoggedIn = true; // TEMP WHILST TESTING>>>>!!!!! TODO: REMOVE ME!
      patchingCompleted();
    }
  }

  function gotVersions(err, versions) {
    var $lblStatus = $('#lblStatus');
    if (err) {
      console.error(err);
      return;
    }

    console.log(versions);
    var emitter = patcher.goPatch(goPatchResult);

    // emitter.on('currentDownloadProgress', function(number) {
    //   $lblStatus.text('Reading Patch Info ' + number + ' of ' + patcher.serverVersion+'.');
    // }
    emitter.on('readingInfo', function(number) {
      $lblStatus.text('Reading Patch Info ' + number + ' of ' + patcher.serverVersion + '.');
    });
    var previousVersion = 0;
    emitter.on('waitingForInfo', function(number) {
      // Only set text once... since it wont change if the number has not changed.
      if (number != previousVersion) {
        number = previousVersion;
        $lblStatus.text('Downloading Patch Info ' + number + ' of ' + patcher.serverVersion + '.');
      }
    });

    emitter.on('alert', function(message) {
      alert(message);
    });

    emitter.on('reload', function() {
      console.log('Will reload Launcher after this patch.');
      patcher.reload = true;
    });



    emitter.on('extracting', function(path) {
      console.log('extracting '+path);
    });

    emitter.on('7zipProgress', function(files) {
      console.log('7zipProgress', files);
    });

    emitter.on('extracted', function() {
      console.log('extracted');
    });

    emitter.on('render', function(info) {

      var basename = path.basename(info.url);

      console.log(
        basename + ' ' +
        info.bar.format.storage(info.stats.currentSize) + ' ' +
        info.bar.format.speed(info.stats.speed) + ' ' +
        info.bar.format.time(info.stats.elapsedTime) + ' ' +
        info.bar.format.time(info.stats.remainingTime) + ' [' +
        info.bar.format.progressBar(info.stats.percentage) + '] ' +
        info.bar.format.percentage(info.stats.percentage)
      );

    });
  }


  patcher.getVersions(gotVersions);

  function login(event) {
    event.preventDefault();
    $('.launch').prop('disabled', true);
    username = $('#txtUsername').val();
    password = $('#txtPassword').val();
    if (username == '') {
      alert('Please enter a username.');
      $('#txtUsername').focus();
      return;
    }
    if (password == '') {
      alert('Please enter a password.');
      $('#txtPassword').focus();
      return;
    }
    $('.info .name').text(username);
    isLoggedIn = true;
    if (isFinishedPatching) {
      $('.launch').removeProp('disabled');
    }
    // TODO: actually login
    $('.content_area .content').hide();
    $('.content.patch').show();
  }
});