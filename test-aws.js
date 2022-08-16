//needs to fall back to loading the existing models/data if bimserver is down


const needle = require("needle");
const fs = require("fs");
const cors = require("cors");
const express = require("express");
const { Server } = require("socket.io");
const { Socket } = require("dgram");
const http = require("http");

//setup basic express server
const app = express();
const port = 8088;
app.use(cors());
app.use(express.static("./")); //serves files on root folder

const server = http.createServer(app);
//const io = new Server(server);


//bimserver details
let address = "http://13.40.172.106:9099/bimserver/";

let username = "adminj@s8345537a.com";
let password = "HzYf-=StY=EFbpw;h3Zv";
let options = { json: true };

// let query = { //see examples at bimviews plugin
//     type: {
//       name: "IfcProduct",
//       includeAllSubTypes: true,
//     },
//   };

let query = {};

//login

let loginData = {
  request: {
    interface: "AuthInterface",
    method: "login",
    parameters: {
      username: username,
      password: password,
    },
  },
};


//test getrevisionid
// needle.post(address + "json", loginData, options, (err, resp) => {
//   if (err) {
//     console.log(err);
//   }
//   let token = resp.body.response.result;
//       //get revision

//       let getRevisionProject = {
//         token: token,
//         request: {
//           interface: "ServiceInterface",
//           method: "getAllRevisionsOfProject",
//           parameters: {
//             poid: 1769473,
//           },
//         },
//       };

//       needle.post(
//         address + "json",
//         getRevisionProject,
//         options,
//         (err, resp) => {
//           if (err) {
//             console.log(err);
//           }

//           let res = resp.body.response.result; //undefined?
//           let reslist = [];

//           res.forEach((element) => {
//             //onsole.log(element.oid);
//             reslist.push(element.oid);
//             //map1.set(element.oid, element.name);
//           });


//           console.log("rev id: " + reslist);
//         });
//       });


//create project and upload model

needle.post(address + 'json', loginData, options, (err, resp) => {
    if (err) {
        console.log(err)
    }

    var token = resp.body.response.result;

    //console.log("logged in ", token);

    let addProjectData = {
        "token": token,
        "request": {
            "interface": "ServiceInterface",
            "method": "addProject",
            "parameters": {
                "projectName": "testproject" + Math.random(),
                "schema": "ifc2x3tc1"
            }
        }
    }

    //add a project
    needle.post(address + 'json', addProjectData, options, (err , resp) => {
        if (err) {
            console.log(err)
        }

        let poid = resp.body.response.result.oid
        console.log("project oid: "+ poid);

        let serializerData = {
            "token": token,
            "request": {
                "interface": "ServiceInterface",
                "method": "getSuggestedDeserializerForExtension",
                "parameters": {
                  "extension": "ifc",
                  "poid": poid
                }
              }
        }

        needle.post(address + 'json', serializerData, options, (err, resp) => {
            if (err) {
                console.log(err)
            }

            let serid = resp.body.response.result.oid;
            console.log("deserializer oid: " + serid);

            //checkin
            let checkin = {
                "token": token,
                "request": {
                  "interface": "ServiceInterface",
                  "method": "checkinFromUrlSync",
                  "parameters": {
                    "poid": poid,
                    "comment": "",
                    "deserializerOid": serid,
                    "fileName": "rac_advanced_sample_project.ifc",
                    "url": "http://192.168.56.1:5500/" + "", //need to change this to url plus (input from socket.io)
                    "merge": "false"
                  }
                }
              }

            needle.post(address + 'json', checkin, options, (err, resp) => {
                if (err) {
                    console.log(err)
                }
                console.log("checked in file" + resp);
            })

        })

    })
})

//socket on, download ifc model

//download ifc model
// needle.post(address + 'json', loginData, options, (err, resp) =>
// {
//     if (err) {
//             console.log(err)
//         }
//     let token = resp.body.response.result;
//     //getSerializerByContentType
//     let serializerByContentType = {
//         "token": token,
//         "request" : {
//             "interface" : "ServiceInterface",
//             "method" : "getSerializerByContentType",
//             "parameters" : {
//                 "contentType": "application/ifc",
//             }
//         }
//     }
//     needle.post(address + 'json', serializerByContentType, options, (err, resp) =>
//     {
//         if (err) {
//             console.log(err)
//         }

//         let serializerOid = resp.body.response.result.oid;

//         let download = {
//             "token": token,
//             "request": {
//                 "interface": "ServiceInterface",
//                 "method": "download",
//                 "parameters": {
//                     "roids": [1245187], //test various
//                     "query": JSON.stringify(query),
//                     "serializerOid": serializerOid,
//                     "sync": false
//                 }
//             }
//         }
//         console.log("serializerOid" + serializerOid);
//     //download
//         needle.post(address + 'json', download, options, (err,resp)=> {
//             if (err) {
//                 console.log(err)
//             }

//             let topicId = resp.body.response.result;
//              //getDownloadData using topicId
//              let downloadData = {
//                 "token": token,
//                 "request": {
//                     "interface" : "ServiceInterface",
//                     "method": "getDownloadData",
//                     "parameters": {
//                         "topicId": topicId
//                     }
//                 }
//              }
//              console.log("topic id" + topicId);

//             let progress = {
//                 "token": token,
//                 "request": {
//                   "interface": "NotificationRegistryInterface",
//                   "method": "getProgress",
//                   "parameters": {
//                     "topicId": topicId
//                   }
//                 }
//               }

//               needle.post(address + 'json', progress, options, (err,resp)=> {
//                 if (err) {
//                     console.log(err)
//                 }

//                 console.log("progress: " + resp.body.response.result);

//              needle.post(address + 'json', downloadData, options, (err,resp)=> {
//                 if (err) {
//                     console.log(err)
//                 }

//                 //console.log("downloadData" + resp.body.response.result.file);

//                 var fileData = resp.body.response.result.file;
//                 var fileString = new Buffer(fileData, "base64");

//                 fs.writeFile( 'testmodel.ifc', fileString, function(err) { //localhost?
//                     if (err) throw err;
//                     //console.log('saved', rev.oid);
//                     //callback();
//                   });

//              })
//         })
//     })
//     })

// })
