const fs = require("fs");

var config = null;
const configFile = "./config.json";

module.exports = {
     getConfig: function () {
          if (config) {
               return config;
          }
          config = JSON.parse(fs.readFileSync(configFile, "UTF-8"));
          return config;
     },
     saveConfig: function (conf) {
          config = conf;
          fs.writeFileSync(configFile, JSON.stringify(config, null, 4), "UTF-8");
     }
}
