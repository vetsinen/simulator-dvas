const { v4: uuidv4 } = require('uuid');
const fs = require("fs")
const path = require("path");

module.exports = {
     clone: function (obj) {
          return JSON.parse(JSON.stringify(obj));;
     },
     findFileInDir: function (dir, fileName) {
          console.log(fileName);
          let files = fs.readdirSync(dir)
          for (let i in files) {
               file = files[i];
               let fullPath = path.join(dir, file);
               if (fs.lstatSync(fullPath).isDirectory()) {
                    console.log(fullPath);
                    let ret = this.findFileInDir(fullPath, fileName);
                    console.log("ret:" + ret);
                    if (ret) {
                         return ret;
                    }
               } else {
                    console.log(fullPath);
                    if (fullPath) {
                         if (fullPath.trim().endsWith(fileName.trim())) {
                              console.log("return");
                              return { path: fullPath, dir: dir };
                         }
                    }
               }
          }
          return null;
     },
     generateGuid: function (t) {
          if (!this) {
               t = new Date(Date.now());
          }
          let strDate = t.getUTCFullYear() + "" + this.padStart(t.getUTCMonth() + 1, 2, "0") + "" +
               this.padStart(t.getUTCDate(), 2, "0") + "" +
               this.padStart(t.getUTCHours(), 2, "0") + "" +
               this.padStart(t.getUTCMinutes(), 2, "0") + "" +
               this.padStart(t.getUTCSeconds(), 2, "0") +
               "" + this.padEnd(t.getUTCMilliseconds(), 3, "0");
          return (uuidv4() + "_" + strDate);
     },
     padEnd: function (num, padlen, padchar) {
          var pad_char = typeof padchar !== 'undefined' ? padchar : '0';
          var pad = new Array(1 + padlen).join(pad_char);
          return (num + pad).substring(0, padlen);
     },
     padStart: function (num, padlen, padchar) {
          var pad_char = typeof padchar !== 'undefined' ? padchar : '0';
          var pad = new Array(1 + padlen).join(pad_char);
          return (pad + num).slice(-pad.length);
     },
     getDateAsIso: function (t) {
          var timezone_offset_min = new Date().getTimezoneOffset(),
               offset_hrs = parseInt(Math.abs(timezone_offset_min / 60)),
               offset_min = Math.abs(timezone_offset_min % 60),
               timezone_standard;

          if (offset_hrs < 10)
               offset_hrs = '0' + offset_hrs;

          if (offset_min < 10)
               offset_min = '0' + offset_min;

          // Add an opposite sign to the offset
          // If offset is 0, it means timezone is UTC
          if (timezone_offset_min < 0)
               timezone_standard = '+' + offset_hrs + ':' + offset_min;
          else if (timezone_offset_min > 0)
               timezone_standard = '-' + offset_hrs + ':' + offset_min;
          else if (timezone_offset_min == 0)
               timezone_standard = '+00:00';

          return (t.getUTCFullYear() + "-" + this.padStart(t.getUTCMonth() + 1, 2, "0") + "-" +
               this.padStart(t.getUTCDate(), 2, "0") + "T" +
               this.padStart(t.getUTCHours(), 2, "0") + ":" +
               this.padStart(t.getUTCMinutes(), 2, "0") + ":" +
               this.padStart(t.getUTCSeconds(), 2, "0") +
               "." + this.padEnd(t.getUTCMilliseconds(), 3, "0") + timezone_standard);
     }
}