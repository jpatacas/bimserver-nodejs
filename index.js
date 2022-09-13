
const needle = require("needle");
const fs = require("fs");
const cors = require("cors");
const express = require("express");
const http = require("http");

//setup basic express server
const app = express();
const port = 8088;
app.use(cors());
app.use(express.static("./")); //serves files on root folder

const server = http.createServer(app);

const io = require("socket.io")(server, {
  cors: {
    origin: "*", //this should be changed
    methods: ["GET", "POST"],
  },
});

//bimserver details
let address = "http://localhost:8082/";

let username = "admin@bimserver.org";
let password = "admin";

let options = { json: true };

// let query = { //see examples at bimserver bimviews plugin
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

io.on("connection", (socket) => {
  console.log("a user connected");

  //create project
  socket.on(
    "createProject",
    (projName) => {
      needle.post(address + "json", loginData, options, (err, resp) => {
        if (err) {
          console.log(err);
        }

        var token = resp.body.response.result;

        //console.log("logged in ", token);


        let addProjectData = {
          token: token,
          request: {
            interface: "ServiceInterface",
            method: "addProject",
            parameters: {
              projectName: projName,
              schema: "ifc2x3tc1",
            },
          },
        };

        //add a project
        needle.post(address + "json", addProjectData, options, (err, resp) => {
          if (err) {
            console.log(err);
          }
          console.log("created project: " + projName);
          let poid = resp.body.response.result.oid
          console.log("poid: " + poid);
        });

      });
      
    }
  );

  //get list of projects in bimserver
  socket.on("getProjects", (arg) => {
    needle.post(address + "json", loginData, options, (err, resp) => {
      if (err) {
        console.log(err);
      }
      let token = resp.body.response.result;

      let getAllProjectsData = {
        token: token,
        request: {
          interface: "ServiceInterface",
          method: "getAllProjects",
          parameters: {
            onlyTopLevel: false,
            onlyActive: true,
          },
        },
      };

      needle.post(
        address + "json",
        getAllProjectsData,
        options,
        (err, resp) => {
          if (err) {
            console.log(err);
          }
          let res = resp.body.response.result;
          let reslist = [];
          let resname = [];
          //let map1 = new Map();

          res.forEach((element) => {
            reslist.push(element.oid);
            //map1.set(element.oid, element.name);
          });

          res.forEach((element) => {
            resname.push(element.name);
          });

          socket.emit("projectIds", resname, reslist);
        }
      );
    });

  });

  
  //create project, upload model, return poid
  socket.on("uploadModel", (fileName, ifcURL) => {
   // console.log("filename: " + fileName,"ifcurl: " + ifcURL), //ok
   needle.post(address + "json", loginData, options, (err, resp) => {
    if (err) {
      console.log(err);
    }

    var token = resp.body.response.result;

    //console.log("logged in ", token);


    let addProjectData = {
      token: token,
      request: {
        interface: "ServiceInterface",
        method: "addProject",
        parameters: {
          projectName: fileName + Math.random(),
          schema: "ifc2x3tc1",
        },
      },
    };

    //add a project
    needle.post(address + "json", addProjectData, options, (err, resp) => {
      if (err) {
        console.log(err);
      }
      console.log("created project: " + fileName);
      let poid = resp.body.response.result.oid
      console.log("poid: " + poid);
            

            let serializerData = {
                token: token,
                request: {
                    interface: "ServiceInterface",
                    method: "getSuggestedDeserializerForExtension",
                    parameters: {
                      extension: "ifc",
                      poid: poid
                    }
                  }
            }

            needle.post(address + 'json', serializerData, options, (err, resp) => {
                if (err) {
                    console.log(err)
                }

                let serid = resp.body.response.result.oid;
                console.log("deserializer id: " + serid);

               // work around to check in files using URL - can't get checkinSync to work 
                let checkin = {
                    token: token,
                    request: {
                      interface: "ServiceInterface",
                      method: "checkinFromUrlSync",
                      parameters: {
                        poid: poid,
                        comment: "",
                        deserializerOid: serid,
                        fileName: fileName + ".ifc",
                        url: ifcURL,
                        merge: "false"
                      }
                    }
                  }
             // console.log(ifcFile);

          //doesnt work with checninsync or checkinasync?
                // let checkin = 
                // {
                //   token: token,
                //   request: {
                //     interface: "ServiceInterface", 
                //     method: "checkinSync", 
                //     parameters: {
                //       poid: poid,
                //       comment: "",
                //       deserializerOid: serid,
                //       fileSize: "",
                //       fileName: fileName + ".ifc",
                //       data: ifcFile,
                //       merge: "false"
                //     }
                //   }
                // }

                // let filePath = "C:\\Users\\jlpat\\Documents\\dev\\ifc.js\\course\\final\\models\\haus.ifc";

                // //let filePath = ifcURL;

                // fs.readFile(filePath, function (err, data) { 
                //   let encodedFileData = new Buffer(data).toString('base64');
                //   let checkin = 
                //   {
                //     token: token,
                //     request: {
                //       interface: "ServiceInterface", 
                //       method: "checkinSync", 
                //       parameters: {
                //         poid: poid,
                //         comment: "",
                //         deserializerOid: serid,
                //         fileSize: encodedFileData.length,
                //         fileName: fileName + ".ifc",
                //         data: encodedFileData,
                //         merge: "false"
                //       }
                //     }
                //   }

                //   needle.post(address + 'json', checkin, options, (err, resp) => {
                //     if (err) {
                //         console.log(err)
                //     }
                //     console.log("checked in file: " + resp.body.response.result);
                //     socket.emit("newProjectData", fileName, poid);
                    
                // })

                // })


                needle.post(address + 'json', checkin, options, (err, resp) => {
                    if (err) {
                        console.log(err)
                    }
                    console.log("checked in file: " + resp.body.response.result);
                    socket.emit("newProjectData", fileName, poid);
                    
                })
                
            })
            
        })
    })
  
  } );
  //get latest revision given project id

  socket.on("getLatestRevision", (currentProjectID) => {
    needle.post(address + "json", loginData, options, (err, resp) => {
      if (err) {
        console.log(err);
      }
      let token = resp.body.response.result;
      //getSerializerByContentType
      let serializerByContentType = {
        token: token,
        request: {
          interface: "ServiceInterface",
          method: "getSerializerByContentType",
          parameters: {
            contentType: "application/ifc",
          },
        },
      };
      needle.post(
        address + "json",
        serializerByContentType,
        options,
        (err, resp) => {
          if (err) {
            console.log(err);
          }

          let serializerOid = resp.body.response.result.oid;

          //get revision

          let getRevisionProject = {
            token: token,
            request: {
              interface: "ServiceInterface",
              method: "getAllRevisionsOfProject",
              parameters: {
                poid: currentProjectID,
              },
            },
          };

          needle.post(
            address + "json",
            getRevisionProject,
            options,
            (err, resp) => {
              if (err) {
                console.log(err);
              }

              let res = resp.body.response.result;

              let revisionId = [];

              res.forEach((element) => {
                revisionId.push(element.oid);
                //map1.set(element.oid, element.name);
              });
    
              console.log("rev id: " + revisionId);

              let fileName = "model" + currentProjectID + revisionId.toString() + ".ifc";

              if (!fs.existsSync("./" + fileName))
              {
                let download = {
                  token: token,
                  request: {
                    interface: "ServiceInterface",
                    method: "download",
                    parameters: {
                      roids: revisionId, //array/list of revisions, need to check this... 
                      query: JSON.stringify(query),
                      serializerOid: serializerOid,
                      sync: false,
                    },
                  },
                };
                console.log("serializerOid" + serializerOid);
                //download
                needle.post(address + "json", download, options, (err, resp) => {
                  if (err) {
                    console.log(err);
                  }
  
                  let topicId = resp.body.response.result;
                  //getDownloadData using topicId
                  let downloadData = {
                    token: token,
                    request: {
                      interface: "ServiceInterface",
                      method: "getDownloadData",
                      parameters: {
                        topicId: topicId,
                      },
                    },
                  };
                  console.log("topic id" + topicId);
  
                  let progress = {
                    token: token,
                    request: {
                      interface: "NotificationRegistryInterface",
                      method: "getProgress",
                      parameters: {
                        topicId: topicId,
                      },
                    },
                  };
  
                  needle.post(
                    address + "json",
                    progress,
                    options,
                    (err, resp) => {
                      if (err) {
                        console.log(err);
                      }
  
                      console.log("progress: " + resp.body.response.result);
  
                      needle.post(
                        address + "json",
                        downloadData,
                        options,
                        (err, resp) => {
                          if (err) {
                            console.log(err);
                          }
    
                          var fileData = resp.body.response.result.file;
                          var fileString = new Buffer(fileData, "base64");

                          fs.writeFile(
                            fileName,
                            fileString,
                            function (err) {

                              if (err) throw err;
                            }
                          );
  
                          socket.emit("fileName", fileName);
                        }
                      );
                    }
                  );
                });
              }
              //else load latest/existing model
               else { socket.emit("fileName", fileName);}
            }
          );
        }
      );
    });
  });
});

server.listen(port, () =>
  console.log(`Example app listening on port ${port}!`)
);

