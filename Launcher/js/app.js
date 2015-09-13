// Load native UI library
var gui = require('nw.gui');

// Get the current window
var win = gui.Window.get();
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

GAME_EXE = 'TwelveSky.exe';
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

  // Check if we have to traverse up a directory.
  function launch(goupdirectory) {
    if (goupdirectory === undefined) {
      goupdirectory = true;
    }
    var current_directory = process.cwd()
    try {
      if (goupdirectory) {
        process.chdir("../");
      }
      if (injector.executeInject(GAME_EXE+" /_AEnt12/" + (localStorage.graphics.fullscreen ? 3 : 2) + "/" + (localStorage.graphics.resolution_x || 1024) + "/" + (localStorage.graphics.resolution_y || 768), "TS1_Client.dll")) {
        console.log('Process started and injected.');
        window.close();
      } else {
        console.log('Unable to execute and inject dll.');
        var mes = 'Unable to start game. Please run the Launcher as administrator.';
        $('#lblStatus').text(mes);
        alert(mes+'\nAnd ensure the Visual Studio C++ 2012 Runtimes are installed. You can find them in the redist directory or google them.');
      }
    } catch (err) {
      console.error('Exception Thrown!');
      console.error(err);
    }
    if (goupdirectory) {
      process.chdir(current_directory)
    }
  }

  var launchingPleaseWait = false;
  function btnLaunchGame_Clicked() {
    if (launchingPleaseWait) return;
    handle_rememberme();
    setTimeout(function(){ launchingPleaseWait = false; }, 10000);
    var stats = fs.stat('../'+GAME_EXE, function(err, stats){
        if (err) {
          alert("Cant find "+GAME_EXE+" please ensure it is in the folder above where the Launcher is running from. Working Directory might be set wrong? "+process.cwd());
          return;
        }
        launch(true);
    });
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