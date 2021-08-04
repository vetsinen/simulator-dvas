const fs = require("fs");
const request = require("request");
const Config = require("./config");
const HttpApi = require("./httpApi2_0");
const express = require('express');
//const path = require("path");
//const { v4: uuidv4 } = require('uuid');
const common = require("./common");
const { generateGuid } = require("./common");

var captures = [];
var eventGeneration = false;
var triggerId = 0;
var vehicleTriggerId = 0;

var me = this;

var config = Config.getConfig();

var httpApi = new HttpApi(config.inex_integration);

function random(min, max) {
     return Math.floor(
          Math.random() * (max - min) + min
     )
}

var app = express();
app.use(express.json());

app.get("/api/v2/image/:id1", function (req, resp) {
     try {
          let path = common.findFileInDir(config.data_path, `${req.params.id1}.jpg`);
          let event = JSON.parse(fs.readFileSync(`${path.dir}/event.json`, "UTF-8"));
          //          let evDate = new Date(e.ts);          
          let image = {};
          for (let i in event.images) {
               if (event.images[i].image_guid == req.params.id1) {
                    image = event.images[i];
                    break;
               }
          }
          image.image_data = fs.readFileSync(path.path).toString('base64');
          resp.json(image).end();
     } catch (ex) {
          resp.sendStatus(404);
     }
});

app.get("/api/v2/trigger", function (req, resp) {
     console.log(42)
     if (config.mode == "triggered") {
          processTriggerRequest(req, resp);
     }
     else {
          resp.end();
     }
});

app.get("/api/v2/capture", function (req, resp) {
     if (config.mode == "triggered") {
          processCaptureRequest(req, resp);
     }
     else {
          resp.end();
     }
});

app.get("/api/v2/keep", function (req, resp) {
     if (config.mode == "triggered") {
          processKeepRequest(req, resp);
     }
     else {
          resp.end();
     }
});

app.listen(config.port, (err) => {
     if (err) {
          return console.log('something bad happened', err)
     }
     console.log(`server is listening on ${config.port}`)
})


console.log("Started")

function processKeepRequest(req, resp) {
     if (!req.query.event_id) {
          console.log(`Event ID not defined (${req.query.event_id}), ignore keep`);
          resp.sendStatus(400).end();
          return;
     }
     if (req.query.lane_id && parseInt(req.query.lane_id) != config.lane_id) {
          console.log(`Incorrect lane id (${req.query.lane_id}), ignore keep`);
          resp.sendStatus(400).end();
          return;
     }
     let eventId = parseInt(req.query.event_id);
     if (captures.filter(e => e.event_id == eventId).length == 0) {
          console.log(`Event ID not found in captures buffer (${req.query.event_id}), ignore keep`);
          resp.sendStatus(400).end();
          return;
     }
     let trg = createKeepFromRequest(req);
     processKeep(trg);
     resp.end();
}

function processCaptureRequest(req, resp) {
     if (!req.query.event_id) {
          console.log(`Event ID not defined (${req.query.event_id}), ignore capture`);
          resp.sendStatus(400).end();
          return;
     }
     if (req.query.lane_id && parseInt(req.query.lane_id) != config.lane_id) {
          console.log(`Incorrect lane id (${req.query.lane_id}), ignore capture`);
          resp.sendStatus(400).end();
          return;
     }
     let trg = createCaptureFromRequest(req);
     processCapture(trg);
     resp.end();
}

function processCapture(capture) {
     captures.push(capture);
}

function processKeep(keep) {
     let capture = captures.find(c => c.event_id == keep.event_id);
     if (capture) {
          console.log(`process keep`);
          console.log(keep);
          if (!eventGeneration) {
               eventGeneration = true;
               setTimeout(function () {
                    sendEventByKeep(capture, keep);
               }, config.event_send_timeout);
          }
     }
}

function processTriggerRequest(req, resp) {
     if (req.query.lane_id && parseInt(req.query.lane_id) != config.lane_id) {
          console.log(`Incorrect lane id (${req.query.lane_id}), ignore trigger`);
          resp.sendStatus(400).end();
          return;
     }
     let trg = createTriggerFromRequest(req);
     processTrigger(trg);
     resp.end();
}

function sendVehicleTrigger()
{
     vehicleTriggerId++;
     let dt = new Date(Date.now());
     let uri = `${config.inex_integration.url}/trigger?`;
     uri += `trigger_id=${vehicleTriggerId}&`;
     uri += `trigger_timestamp=${encodeURIComponent(common.getDateAsIso(dt))}&`;
     uri += `vehicle_guid=${encodeURIComponent(common.generateGuid(dt))}&`;
     uri += `trigger_source=LCS&`;
     uri += `trigger_name=lctrigger&`;
     uri += `lane_id=${config.lane_id}&`;
     uri += `event_id=${vehicleTriggerId + 100}&`;
     uri += `event_data=EventData`;
     request(uri, function (error, response, body) {
          if (!error && response.statusCode == 200) {
               console.log("Vehicle Trigger was sent: " + uri);
          } else {
               console.error("Vehicle Trigger sending failed: " + uri + ":" + error);
          }
     });
}

/*function sendTriggerNotification(trg) {
     let trNotif = common.clone(trg);
     trNotif.lane_id = config.lane_id;
     trNotif.lane_name = config.lane_name;
     var optionsI = {
          uri: `${config.inex_integration.url}/triggernotification`,
          method: "POST",
          json: trNotif
     };
     request(optionsI, function (error, response, body) {
          if (!error && response.statusCode == 200) {
               console.log("Trigger notification was sent: " + optionsI.uri);
          } else {
               console.error("Trigger notification sending failed: " + optionsI.uri + ":" + error);
          }
     });
}*/

function createKeepFromRequest(req) {
     let newKeep = {};
     if (req.query.keep_source) {
          newKeep.keep_source = req.query.keep_source;
     }
     if (req.query.keep_timestamp) {
          newKeep.keep_timestamp = req.query.keep_timestamp;
     }
     parseGeneralData(req, newKeep);
     return newKeep;
}

function createCaptureFromRequest(req) {
     let newCapture = {};
     newCapture.ts = Date.now();
     if (req.query.capture_source) {
          newCapture.capture_source = req.query.capture_source;
     }
     if (req.query.capture_timestamp) {
          newCapture.capture_timestamp = req.query.capture_timestamp;
     }
     parseTriggerData(req, newCapture);
     parseGeneralData(req, newCapture);
    
     return newCapture;
}

function parseTriggerData(req, newTrigger) {
     if (req.query.trigger_id) {
          newTrigger.trigger_id = parseInt(req.query.trigger_id);
     }
     if (req.query.vehicle_guid) {
          newTrigger.vehicle_guid = req.query.vehicle_guid;
     }
     if (req.query.trigger_name) {
          newTrigger.trigger_name = req.query.trigger_name;
     }
     if (req.query.trigger_data) {
          newTrigger.trigger_data = req.query.trigger_data;
     }
}

function parseGeneralData(req, newTrigger) {
     if (req.query.lane_id) {
          newTrigger.lane_id = parseInt(req.query.lane_id);
     }
     if (req.query.event_data) {
          newTrigger.event_data = req.query.event_data;
     }
     if (req.query.event_id) {
          newTrigger.event_id = parseInt(req.query.event_id);
     }
}

function createTriggerFromRequest(req) {
     let newTrigger = {};
     if (req.query.trigger_timestamp) {
          newTrigger.trigger_timestamp = req.query.trigger_timestamp;
     }
     if (req.query.trigger_source) {
          newTrigger.trigger_source = req.query.trigger_source;
     }
     parseTriggerData(req, newTrigger);
     parseGeneralData(req, newTrigger);
     return newTrigger;
}

function createRandomTrigger() {
     triggerId++;
     let dt = new Date(Date.now());
     console.log(dt);
     newTrigger = {
          trigger_id: triggerId,
          trigger_source: "RV",
          trigger_guid: common.generateGuid(dt),
          trigger_timestamp: common.getDateAsIso(dt),
          lane_id: config.lane_id
     };
     return newTrigger;
}

function processTrigger(trg) {
     console.log(`process trigger`);
     console.log(trg);
     if (trg.trigger_source) {
          if (trg.trigger_source.toLowerCase() == "void") {
               if (me.trigger && trg.trigger_id == me.trigger.trigger_id) {
                    me.trigger = null;
                    console.log(`void received: trigger with id ${trg.trigger_id} cancelled`);
                    return;
               }
               else {
                    console.log(`void received: trigger with id ${trg.trigger_id} cannot be cancelled: not found`);
               }
          }
     }
     me.trigger = trg;
     if (!eventGeneration) {
          eventGeneration = true;
          setTimeout(sendEventByTrigger, config.event_send_timeout);
     }
}

function sendEventByKeep(capture, keep) {
     eventGeneration = false;
     sendEvent(null, capture, keep);
}

function sendEventByTrigger() {
     eventGeneration = false;
     if (me.trigger == null) {
          console.log(`cancel event`)
          return;
     }
     sendEvent(me.trigger);
     // me.trigger = null;
}

function sendEvent(trigger, capture, keep) {
     let list = fs.readdirSync(config.data_path);
     console.log("Dirs count " + list.length);
     let index = random(0, list.length);

     let dir = list[index];
     let event = JSON.parse(fs.readFileSync(`${config.data_path}/${dir}/event.json`, "UTF-8"));
     let images = null;

     let dt = new Date(Date.now());
     if (trigger) {
          event.trigger = trigger;
          delete event.trigger["trigger_id"];
          delete event.trigger["trigger_name"];
          delete event.trigger["trigger_data"];
          delete event.trigger["lane_id"];

          if (trigger.event_id) {
               event.event_id = trigger.event_id;
          }
     }
     if (capture) {
          event.capture = capture;
          delete event.capture["trigger_id"];
          delete event.capture["trigger_name"];
          delete event.capture["trigger_data"];
          delete event.capture["lane_id"];
          delete event.capture["ts"];
          if (capture.event_id) {
               event.event_id = capture.event_id;
          }
     }
     if (keep) {
          event.keep = keep;
          delete event.keep["lane_id"];          
     }
     event.lane_id = config.lane_id;
     event.lane_name = config.lane_name;
     event.event_guid = common.generateGuid(dt);
     event.event_timestamp = common.getDateAsIso(dt);

     for (let i in event.images) {
          event.images[i].image_timestamp = common.getDateAsIso(dt);
          let imagePath = `${config.data_path}/${dir}/${event.images[i].image_guid}.jpg`;
          //console.log(imagePath);
          if (config.inex_integration.include_image_data) {
               if (fs.existsSync(imagePath)) {
                    event.images[i].image_data = fs.readFileSync(imagePath).toString('base64');
                    //console.log("Image loaded");
               }
          }
          else {
               delete event.images[i]["image_data"];
               delete event.images[i]["image_encoding"];
          }
     }

     if (config.inex_integration.separated_images) {
          images = {};
          images.event_guid = event.event_guid;
          images.images = event.images.slice();
          event.images = [];
     }
     httpApi.sendEvent(event, images);
     console.log("Event sent");
}

if (config.mode == "nontriggered") {
     setInterval(() => {
          sendEvent();
     }, config.nontriggered_send_timeout);
}

setInterval(() => {
     captures = captures.filter(c => Date.now() - c.ts < config.capture_remove_timeout);
}, 1000);

if (config.vehicle_trigger_enabled)
{
     setInterval(() => {
          sendVehicleTrigger();
     }, config.vehicle_trigger_timeout);  
}