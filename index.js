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
let address = "BIMSERVER_ADDRESS";

let username = "USERNAME";
let password = "PASSWORD";

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

const makeRequest = async (endpoint, data) => {
  try {
    const response = await needle("post", address + endpoint, data, options);
    return response.body.response.result;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

io.on("connection", (socket) => {
  console.log("a user connected");

  //create project
  socket.on("createProject", async (projName) => {
    try {
      const token = await makeRequest("json", loginData);

      const addProjectData = {
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

      const resp = await makeRequest("json", addProjectData);
      console.log("created project: " + projName);
      const poid = resp.oid;
      console.log("poid: " + poid);
    } catch (error) {
      console.error(error);
    }
  });

  //get list of projects in bimserver
  socket.on("getProjects", async (arg) => {
    try {
      const token = await makeRequest("json", loginData);

      const getAllProjectsData = {
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

      const resp = await makeRequest("json", getAllProjectsData);
      const res = resp.result;
      const reslist = res.map((element) => element.oid);
      const resname = res.map((element) => element.name);

      socket.emit("projectIds", resname, reslist);
    } catch (error) {
      console.error(error);
    }
  });

  //create project, upload model, return poid
  socket.on("uploadModel", async (fileName, ifcURL) => {
    try {
      const token = await makeRequest("json", loginData);

      const addProjectData = {
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

      const resp = await makeRequest("json", addProjectData);
      console.log("created project: " + fileName);
      const poid = resp.oid;
      console.log("poid: " + poid);

      const serializerData = {
        token: token,
        request: {
          interface: "ServiceInterface",
          method: "getSuggestedDeserializerForExtension",
          parameters: {
            extension: "ifc",
            poid: poid,
          },
        },
      };

      const serializerResp = await makeRequest("json", serializerData);
      const serid = serializerResp.oid;
      console.log("deserializer id: " + serid);

      const checkin = {
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
            merge: "false",
          },
        },
      };

      const checkinResp = await makeRequest("json", checkin);
      console.log("checked in file: " + checkinResp.result);

      socket.emit("newProjectData", fileName, poid);
    } catch (error) {
      console.error(error);
    }
  });

  //get latest revision given project id
  socket.on("getLatestRevision", async (currentProjectID) => {
    try {
      const token = await makeRequest("json", loginData);

      const serializerByContentType = {
        token: token,
        request: {
          interface: "ServiceInterface",
          method: "getSerializerByContentType",
          parameters: {
            contentType: "application/ifc",
          },
        },
      };

      const serializerResp = await makeRequest(
        "json",
        serializerByContentType
      );
      const serializerOid = serializerResp.oid;

      const getRevisionProject = {
        token: token,
        request: {
          interface: "ServiceInterface",
          method: "getAllRevisionsOfProject",
          parameters: {
            poid: currentProjectID,
          },
        },
      };

      const revisionResp = await makeRequest("json", getRevisionProject);
      const revisionId = revisionResp.result.map((element) => element.oid);

      const fileName =
        "model" + currentProjectID + revisionId.toString() + ".ifc";

      if (!fs.existsSync("./" + fileName)) {
        const download = {
          token: token,
          request: {
            interface: "ServiceInterface",
            method: "download",
            parameters: {
              roids: revisionId,
              query: JSON.stringify(query),
              serializerOid: serializerOid,
              sync: false,
            },
          },
        };

        const downloadResp = await makeRequest("json", download);
        const topicId = downloadResp.result;

        const downloadData = {
          token: token,
          request: {
            interface: "ServiceInterface",
            method: "getDownloadData",
            parameters: {
              topicId: topicId,
            },
          },
        };

        const downloadDataResp = await makeRequest("json", downloadData);
        const fileData = downloadDataResp.result.file;
        const fileString = new Buffer(fileData, "base64");

        fs.writeFile(fileName, fileString, function (err) {
          if (err) throw err;
        });

        socket.emit("fileName", fileName);
      } else {
        socket.emit("fileName", fileName);
      }
    } catch (error) {
      console.error(error);
    }
  });
});

server.listen(port, () =>
  console.log(`Example app listening on port ${port}!`)
);
