var fs = require('fs'), sys = require('sys'), irc = require('irc'),
    util = require('./util');

var Script = process.binding('evals').Script;

util.extend(global, require('./external/printf.commonjs'));
util.extend(global, require('./external/time.commonjs'));

process.on('uncaughtException', function (err) {
  logit('Caught exception: ' + err);
});

global.config = require('./config');

var stdin = process.openStdin();
stdin.setEncoding('utf8');

config.admin.push('#console#');

stdin.on('data', function (chunk) {
  got_message('#console#', config.nick, chunk);
});

stdin.on('end', function () {
  process.stdout.write('end');
});

if (!Array.prototype.indexOf)
{
  Array.prototype.indexOf = function(elt /*, from*/)
  {
    var len = this.length;

    var from = Number(arguments[1]) || 0;
    from = (from < 0)
         ? Math.ceil(from)
         : Math.floor(from);
    if (from < 0)
      from += len;

    for (; from < len; from++)
    {
      if (from in this &&
          this[from] === elt)
        return from;
    }
    return -1;
  };
}

global.client = new irc.Client(config.server, config.nick, {
  debug: true
});

global.scripts = [];

client.on('motd', function() {
  send('NICKSERV', 'IDENTIFY ' + config.nickserv_password);
  logit('Connected');
});

client.on('raw', function(message) {
  switch(message.command) {
    case "NOTICE":
      if (message.args.join(' ') == config.nick + ' Password accepted - you are now recognized.') {
        for (var i = 0; i < config.channels.length; i++) {
          client.join(config.channels[i]);
        }
      }

      if (message.args.join(' ') == config.nick + ' Your nick isn\'t registered.') {
        setTimeout(function() {
          send('NickServ', 'REGISTER ' + config.nickserv_password + ' ' + config.email);
        }, 30*1000);
      }
    break;
  }
});

client.on('message', function(from, to, msg) {
  got_message(from, to, msg);
});

function send(where, msg) {
  if (where == 'console') {
    logit(msg);
  } else {
    client.say(where, msg);
  }
}

function got_message(from, to, msg) {
  script_invoke('message', from, to, msg);
  
  var commands = [
    'reload-scripts', 'list-scripts', 'help', 'list-admins', 'join', 'part',
    'say', 'quit'
  ];
  
  var actions = [
    function() { // reload scripts
      reload_scripts();
    },
    function() { // list scripts
      for (var i = 0; i < scripts.length; i++) {
        send(from, scripts[i].sandbox.info());
      }
    },
    function() { // help
      var helpmessage = fs.readFile('text/help_message.txt', 'utf8', function(err, data) {
        if (!err) {
          var helpmessage = data.split('\n');
          
          for (var i = 0; i < helpmessage.length; i++) {
            send(from, helpmessage[i]);
          }
        }
      });
    },
    function() { // list admins
      for (var i = 0; i < config.admin.length; i++) {
        send(from, config.admin[i]);
      }
    },
    function() { // join
      client.join(msg.split(' ')[1]);
    },
    function() { // part
      client.part(msg.split(' ')[1]);
    },
    function() { // say
      var say = msg.split(' ');
      say.shift();
      var channel = say.shift();
      send(channel, say.join(' '));
    },
    function() { // quit
      client.quit();
    }
  ];
  
  if (to == config.nick) { // pm
    for (var i = 0; i < config.admin.length; i ++) {
      if (from == config.admin[i]) {
        script_invoke('admin_pm', from, msg);
        
        var command = commands.indexOf(msg.split(' ')[0]);
        
        if (command > -1) {
          actions[command].call();
        }
      }
    }
  }
  
  logit(vsprintf("<%s> <%s> %s", [from, to, msg]));
}

function get_new_sandbox() {
  return {
    logit: logit,
    console: console,
    require: require,
    say: function() {
      global.send.apply(global.client, arguments);
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
        logit('error');
        delete scripts[i];
      }
    }
  }
  
  logit('Scripts loaded');
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
          logit('error');
          delete scripts[i];
        }
      }
    }
  }
}

function logit(msg) {
  console.log(vsprintf("[%s] %s", [date('H:i:s'), msg]));
}

reload_scripts();
