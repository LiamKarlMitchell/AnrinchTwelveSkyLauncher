var gui = require('nw.gui');
var win = gui.Window.get();
var fs = require('fs');
var path = require('path');
var Patcher = require('./js/patcher.js');

var Launcher = function(){
	this.ele = {};
	this.debug = false;
	this.isMaximized = localStorage.getItem('isMaximized') === 'true';
	this.isLogged = false;
	this.session = localStorage.getItem('session');
	this.user = null;
	this.settings = JSON.parse(localStorage.getItem('settings'));
	this.windowDragging = false;
	this.screen = null;
	this.isResizable = false;
	this.Patcher = null;
	this.version = 0;
	this.Paths = PATHS;

	if(!this.settings) this.settings = {};
}

Launcher.prototype.set = function(name, value){
	this.settings[name] = value;
	localStorage.setItem('settings', JSON.stringify(this.settings));
};

Launcher.prototype.get = function(name){
	return this.settings[name];
};

Launcher.prototype.window = function(){
	var self = this;
	if(!this.Screen && this.session){
		$('#loginEmail').attr('disabled', 'disabled');
		$('#loginPassword').attr('disabled', 'disabled');
		$('#login').attr('disabled', 'disabled');
		this.setScreen('Games');
	}else{
		this.setScreen('Login');
	}

	this.ele.minimize.click(function(){
		win.minimize();
	});

	this.ele.close.click(function(){
		win.close();
	});

	win.on('maximize', function(){
		self.isMaximized = true;
		localStorage.setItem('isMaximized', true);
	});

	win.on('unmaximize', function(){
		self.isMaximized = false;
		localStorage.setItem('isMaximized', false);
	});

	this.ele.maximize.click(function(){
		if(self.isMaximized){
			win.show();
			win.unmaximize();
		}else{
			win.show();
			win.maximize();
		}
	});

	this.ele.login.click(function(){
		$(this).html('Formalizing').attr('disabled', 'disabled');

		var ele = $(this);
		$.post('https://anrinch.com/launcher_auth', {
			email: self.ele.loginEmail.val(),
			password: self.ele.loginPassword.val()
		}, function(data, status){

			if(status === 'success'){
				var parsedData = JSON.parse(data);
				if(parsedData.error){
					alert(parsedData.error);
					ele.removeAttr('disabled').html('Submit');
					self.ele.loginPassword.val('');
					return;
				}

				localStorage.setItem('session', parsedData.hash);
				self.session = parsedData.hash;
				self.setScreen('Games');
				self.isLogged = true;
			}
		});
	});

	win.on('resize', function(width, height){
		if(self.isResizable){
			self.set('width', width);
			self.set('height', height);
		}
	});

	app.ele.header.on('mousedown', function(e){
		e.preventDefault();
    	var ele = $(document.elementFromPoint(e.clientX, e.clientY));
    	var className = ele.hasClass('window-action');
    	var id = ele[0].id;

    	if(id === 'header' || ele.hasClass('window-action') || ele.hasClass('title')){
    		self.windowDragging = true;
    	}
	});

	app.ele.header.on('mouseup', function(e){
		e.preventDefault();
    	self.windowDragging = false;
	});

	$(document).on('mousemove', function(e){
		if(self.windowDragging){
			e.preventDefault();
			win.x += e.originalEvent.movementX;
			win.y += e.originalEvent.movementY;
		}
	});

	this.ele.signOut.click(function(){
		if(!self.isLogged){
			return;
		}

		self.isLogged = false;
		self.user = null;
		localStorage.removeItem('session');
		self.setScreen('Login');
	});

	this.Patcher = new Patcher(app);
	this.Patcher.boot();
}


Launcher.prototype.setScreen = function(slug){
	var self = this;
	switch(slug){
		case 'Login':
		app.ele.header.show();
		$('div#pages page').hide();
		this.ele.loginEmail.removeAttr('disabled').focus();
		this.ele.loginPassword.removeAttr('disabled');
		this.ele.login.removeAttr('disabled').html('Submit');
		win.setMinimumSize(400, 500);
		win.setResizable(false);
		this.isResizable = false;
		win.width = 400;
		win.height = 500;
		win.setPosition('center');
		$('div#pages page[slug="Login"]').show();
		$('#resize').hide();
		this.screen = slug;
		break;

		case 'Loading':
		app.ele.header.hide();
		$('div#pages page').hide();
		win.setMinimumSize(400, 500);
		win.setResizable(false);
		this.isResizable = false;
		win.width = 400;
		win.height = 500;
		win.setPosition('center');
		$('div#pages page[slug="Loading"]').show();
		$('#resize').hide();
		this.screen = slug;
		break;

		case 'Games':
		$.post('https://anrinch.com/launcher/', {hash: this.session}, function(data, status){
			if(status === 'success'){
				self.ele.loginPassword.val('');
				var parsedData = JSON.parse(data);

				if(parsedData.error){
					self.ele.loginEmail.removeAttr('disabled').focus();
					alert(parsedData.error);
					self.setScreen('Login');
					return;
				}
				win.setMinimumSize(800, 600);
				win.width = !self.get('width') ? 800 : self.get('width');
				win.height = !self.get('height') ? 600 : self.get('height');
				win.setPosition('center');
				win.setResizable(true);
				self.isResizable = true;
				self.isLogged = true;
				app.ele.header.show();
				$('div#pages page').hide();
				$('div#pages page[slug="Games"]').show();
				$('#resize').show();
				this.screen = slug;
			}else{
				ele.removeAttr('disabled').html('Submit');
			}
		});
		break;

		default:
		alert("Uncommon screen slug");
		break;
	}
};
