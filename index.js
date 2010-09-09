var fs = require('fs'), sys = require('sys'), irc = require('irc');

global.config = require('./config');

global.client = new irc.Client(config.server, config.nick, {
  debug: true
});

var Script = process.binding('evals').Script;

global.scripts = [];

client.on('motd', function() {
  client.say('NICKSERV', 'IDENTIFY ' + config.nickserv_password);
});

client.on('raw', function(message) {
  switch(message.command) {
    case "NOTICE":
      if (message.args.join(' ') == config.nick + ' Password accepted - you are now recognized.') {
        for (var i = 0; i < config.channels.length; i++) {
          client.join(config.channels[i]);
        }
      }
    break;
  }
});

client.on('message', function(from, to, msg) {
  script_invoke('message', from, to, msg);

  switch(from.toLowerCase()) {
    case config.admin[1].toLowerCase():
    case config.admin[0].toLowerCase():
      if (to.indexOf('#') == -1) {
        switch (msg) {
          case 'reload scripts':
            reload_scripts();
          break;
          case 'list scripts':
            for (var i = 0; i < scripts.length; i++) {
              client.say(from, scripts[i].sandbox.info());
            }
          break;
          default:
            var spli = msg.split(' ');
            client.say(spli[0], spli.slice(1).join(' '));
          break;
        }
      }
    break;
    default:
      console.log(msg);
    break;
  }
});

function get_new_sandbox() {
  return {
    console: console,
    require: require,
    say: function() {
      global.client.say.apply(global.client, arguments);
    }
  };
}

function reload_scripts() { 
  for (var i = 0; i < scripts.length; i++) {
    delete scripts[i];
  }
  
  global.scripts = [];
  
  fs.readdir('./scripts/', function(err, files) {
    if (!err) {
      for (var i = 0; i < files.length; i++) {
        if (files[i].indexOf('.js') > -1) {
          scripts.push({
            file: fs.readFileSync('./scripts/' + files[i]),
            name: files[i],
            sandbox: get_new_sandbox()
          });
        }
      }
      
      process_scripts();
    }
  });
}

function process_scripts() {
  for (var i = 0; i < scripts.length; i++) {
    try {
      Script.runInNewContext(scripts[i].file, scripts[i].sandbox, scripts[i].name);
      scripts[i].sandbox.init();
      scripts[i].info = scripts[i].sandbox.info();
    } catch (err) {
      if (err) {
        console.log('error');
        delete scripts[i];
      }
    }
  }
  
  console.log('Scripts loaded');
}

function script_invoke() {
  var args = [];
  var event = arguments[0];
  
  for (var i = 1; i < arguments.length; i++) {
    args.push(arguments[i]);
  }
  
  for (var i = 0; i < scripts.length; i++) {
    if (scripts[i].sandbox['event_' + event]) {
      try {
        scripts[i].sandbox['event_' + event].apply(scripts[i].sandbox, args);
      } catch(err) {
        if (err) {
          console.log('error');
          delete scripts[i];
        }
      }
    }
  }
}

reload_scripts();
