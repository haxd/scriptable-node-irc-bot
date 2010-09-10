init = function() {
  //
};

run = function(whence, id) {
  var request = require('request');
  var jsdom = require('jsdom');
  var html = require('./scripts/quote/html.php');
  
  var turi = 'http://qdb.us/random';
  
  if (0+parseInt(id) > 0) {
    turi = 'http://qdb.us/' + id;
  }
  
  say(whence, 'Loading QDB.us...');
  
  request({uri: turi}, function(error, response, body) {
    logit('Got QDB page');
    
    if (!error && response.statusCode == 200) {
      var window = jsdom.createWindow(body);
      jsdom.jQueryify(window, './scripts/quote/jquery.js', function(window, $) {
        var quote = html.stripslashes(html.html_entity_decode($($('.qt')[0]).html()));
        
        if (quote.length > 3) {
          quote = quote.split('<br>\n');
          
          for (var i = 0; i < quote.length; i++) {
            say(whence, quote[i]);
          }
        } else {
          say(whence, 'Quote could not be found');
        }
      });
    }
  });
};

info = function() {
  return 'QDB Quote Script by Haxd v2.0';
};

event_message = function(from, to, msg) {
  var text = msg.split(' ');

  switch(text[0]) {
    case '!qdb':
      if (text.length > 1) {
        id = text[1];
      } else {
        id = 0;
      }
      
      if (to.indexOf('#') > -1) {
        run(to, id);
      } else {
        run(from, id);
      }
    break;
  }
};
