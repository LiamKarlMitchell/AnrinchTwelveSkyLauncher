var version_string = '';

var patchNotesURL = 'http://12sky.alt1games.co.kr/Launcher/LauncherNew01.htm';
var serverListURL = "https://gist.githubusercontent.com/LiamKarlMitchell/caca832cb0f81a395ed2/raw/457dc2c82c0fd453aae793106d771cadc27aecc6/InfiniteSky_servers.json";
// Load native UI library
var gui = require('nw.gui');
// Get the current window
var win = gui.Window.get();

function btnClose_click(event) {
	window.close();
}

function btnMinimize_click(event) {
	win.minimize();
}

function btnOptions_click(event) {
	showDialog('options_dialog');
}

function btnRegister_click(event) {
	gui.Shell.openExternal("https://anrinch.com/create-an-account/");
}

function navForums_click(event) {
	gui.Shell.openExternal("https://ts1.anrinch.com/forums/");
}

function btnFb_click(event) {
	gui.Shell.openExternal("https://www.facebook.com/12sky1");

}

function btnYoutube_click(event) {
	gui.Shell.openExternal("https://www.youtube.com/channel/UCCvAaQbA2Z9Qw6bnvx06dNw");
}

function navGameBug_click(event) {
	//Needs link to translation bugs on github
	gui.Shell.openExternal("https://github.com/LiamKarlMitchell/InfiniteSky");
}

function navLauncherBug_click(event) {
	gui.Shell.openExternal("https://github.com/LiamKarlMitchell/InfiniteSky_Launcher/issues");
}

function navTranslationBug_click(event) {
	//Needs link to translation bugs on github
	gui.Shell.openExternal("https://github.com/LiamKarlMitchell/InfiniteSky");
}

function btnCommunity_click(event) {
	gui.Shell.openExternal("https://ts1.anrinch.com/forums/");
}

function nav_register_click(event) {
	gui.Shell.openExternal("https://anrinch.com/create-an-account/");
}

function showDialog(dialog_id) {
	$('#fade').show();
	$('#' + dialog_id).show();

}

function closeDialog() {
	$('#fade').hide();
	$('.dialog').hide();
}

$(document).ready(function() {
	// Setup buttons
	$('#btnClose').click(btnClose_click);
	$('#btnOptions').click(btnOptions_click);
	//$('#btnRegister').click(btnRegister_click);
	$('#btnCommunity').click(btnCommunity_click);

	$('#btnFacebook').click(btnFb_click);
	$('#btnMinimize').click(btnMinimize_click);
	$('#navGameBug').click(navGameBug_click);
	$('#navLauncherBug	').click(navLauncherBug_click);
	$('#navTranslationBug').click(navTranslationBug_click);
	$('#nav_forums').click(navForums_click);
	$('#btnYoutube').click(btnYoutube_click);


	//setup divs show/hide on click

	//hide/show server div
	$('.nav_server').click(function() {
		$('.content_area').children().hide();
		$('.bug_report').children().hide();
		$('.server_select').show();
	});

	$('.nav_register').click(nav_register_click);

	//hide/show item mall div
	$('.nav_item_mall').click(function() {
		$('.content_area').children().hide();
		$('.bug_report').children().hide();
		$('.item_mall').show();
	});

	//hide/show bug div and children
	$('.nav_bug ul li:first-child').click(function() {
		$('.content_area').children().hide();
		$('.bug_report').children().hide();
		$('.bug_report').show();
		$('.bug_report_game').show();
	});
	$('.nav_bug ul li:nth-child(2)').click(function() {
		$('.content_area').children().hide();
		$('.bug_report').children().hide();
		$('.bug_report').show();
		$('.bug_report_launcher').show();
	});

	//hide/show options div
	$('.nav_options').click(function() {
		$('.content_area').children().hide();
				
		$('#txtResolutionX').val(localStorage.graphics_resolution_x);
	    $('#txtResolutionY').val(localStorage.graphics_resolution_y);
	    $('#chkFullscreen').prop('checked', localStorage.graphics_fullscreen === 'true');

		$('.options').show();
	});

	//hide/show patch notes div and children
	$('.nav_notes ul li:nth-child(1)').click(function() {
		$('.content_area').children().hide();
		$('.patch_notes').children().hide();
		$('.patch_notes').show();
		$('.patch_notes_kr').show();
	});
	$('.nav_notes ul li:nth-child(2)').click(function() {
		$('.content_area').children().hide();
		$('.patch_notes').children().hide();
		$('.patch_notes').show();
		$('.patch_notes_dll').removeClass("display_none")
	});
	$('.nav_notes ul li:nth-child(3)').click(function() {
		$('.content_area').children().hide();
		$('.patch_notes').children().hide();
		$('.patch_notes').show();
		$('.patch_notes_launcher').removeClass("display_none")
	});



	// Disable start game button untill Launcher finishes patching process.
	$('#btnStartGame').prop('disabled', true);
	$('#fade').click(closeDialog);
	closeDialog();



	//Set it in comments working on it later
	/*
	// Get Version string
	var versiondat = '../PRESENTVERSION.DAT';

	fs.readFile(versiondat,'utf8', function(err,data){
		if (err) {
			alert('Error reading '+versiondat+' please ensure Launcher is in the Twelve Sky directory.');
			console.error(err);
			window.close();
			return;
		}

		version_string += 'Game Version: ' + Number(data);
		$('#version').text(version_string);
	});

	$('#patchnotes').attr('src',patchNotesURL);*/

});