var request = require('request');

module.exports = function (conf) {
     if (conf) {
          this.url = conf.url;
          this.enabled = conf.enabled;
          console.log("Separated Images: " + conf.separated_images);
          this.separated_images = conf.separated_images;
     }
     else {
          this.url = "";
          this.enabled = false;
          this.separated_images = false;
     }
     var me = this;

     this.send = function (event) {
          if (this.enabled) {
               console.log("Received event with id" + event.eventId);
               return this.sendEvent(event);
          }
     };

     this.sendEvent = function (event, images) {
          var options = {
               uri: `${me.url}/event`,
               method: "POST",
               json: event
          };
          request(options, function (error, response, body) {
               if (!error && response.statusCode == 200) {
                    console.log("Event was sent: " + options.uri);
               } else {
                    console.error("Event sending failed: " + options.uri + ":" + error);
               }
          });
          event = null;
          console.log("Separated images: " + me.separated_images);
          if (me.separated_images) {
               var optionsI = {
                    uri: `${me.url}/image`,
                    method: "POST",
                    json: images
               };
               request(optionsI, function (error, response, body) {
                    if (!error && response.statusCode == 200) {
                         console.log("Event images were sent: " + optionsI.uri);
                    } else {
                         console.error("Event images sending failed: " + optionsI.uri + ":" + error);
                    }
               });
               images = null;
          }
          res = null;
          delete res;
     }
}