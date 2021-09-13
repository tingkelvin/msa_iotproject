// Refrigerated Truck app
"use strict";
const chalk = require("chalk");

// Use the Azure IoT device SDK for devices that connect to Azure IoT Central.
var iotHubTransport = require("azure-iot-device-mqtt").Mqtt;
var Client = require("azure-iot-device").Client;
var Message = require("azure-iot-device").Message;
var ProvisioningTransport = require("azure-iot-provisioning-device-mqtt").Mqtt;
var SymmetricKeySecurityClient =
  require("azure-iot-security-symmetric-key").SymmetricKeySecurityClient;
var ProvisioningDeviceClient =
  require("azure-iot-provisioning-device").ProvisioningDeviceClient;
var provisioningHost = "global.azure-devices-provisioning.net";

// Enter your Azure IoT keys.
var idScope = "0ne003ACEE3";
var registrationId = "pet1";
var symmetricKey = "IlUxc5g1L9mhzQwlrD4DYx+nRXBxwkmmVdOwFwnJ9ss==";

var provisioningSecurityClient = new SymmetricKeySecurityClient(
  registrationId,
  symmetricKey
);
var provisioningClient = ProvisioningDeviceClient.create(
  provisioningHost,
  idScope,
  new ProvisioningTransport(),
  provisioningSecurityClient
);
var hubClient;

var petIdentification = "Pet 1";

var rest = require("azure-maps-rest");

// Enter your Azure Maps key.
var subscriptionKeyCredential = new rest.SubscriptionKeyCredential(
  "rjTSJxxGJcbv-PORGu0F2NbrhF0SwWGthAl4i0prtNc"
);

// Azure Maps connection
var pipeline = rest.MapsURL.newPipeline(subscriptionKeyCredential);
var routeURL = new rest.RouteURL(pipeline);

function greenMessage(text) {
  console.log(chalk.green(text) + "\n");
}
function redMessage(text) {
  console.log(chalk.red(text) + "\n");
}

// Truck globals initialized to the starting state of the truck.
// Enums, frozen name:value pairs.

var actEnum = Object.freeze({
  resting: "resting",
  moving: "moving",
  eating: "eating",
  drinking: "drinking",
  go2toilet: "go2toilet",
  randomMove: "randomMove",
});

var action = [
  "resting",
  "sleeping",
  "eating",
  "drinking",
  "go2toilet",
  "randomMove",
];

const eatingTime = 10; // Time to complete delivery, in seconds.
const sleepingTime = 10; // Time to load contents.
const toiletTime = 10; // Time to dump melted contents.
const drinkingTime = 5;
var interval = 30; // Time interval in seconds.

var temp = -2; // Current temperature of contents, in degrees C.
var baseLat = 47.644702; // Base position latitude.
var baseLon = -122.130137; // Base position longitude.
var currentLat = baseLat; // Current position latitude.
var currentLon = baseLon; // Current position longitude.
var destinationLat; // Destination position latitude.
var destinationLon; // Destination position longitude.

var location = {
  eating: [47.6448, -122.13014],
  drinking: [47.6445, -122.1301],
  go2toilet: [47.6443, -122.1309],
};
var state = actEnum.resting; // Truck is full and ready to go!
var act;

var optimalTemperature = -5; // Setting - can be changed by the operator from IoT Central.
var outsideTemperature = 12; // Ambient outside temperature.
const noEvent = "none";
var eventText = noEvent; // Text to send to the IoT operator.
var path = []; // Latitude and longitude steps for the route.
var timeOnPath = []; // Time in seconds for each section of the route.
var petOnSection; // The current path section the truck is on.
var petSectionsCompletedTime; // The time the truck has spent on previous completed sections.
var timeOnCurrentTask = 0; // Time on current task in seconds.

function Degrees2Radians(deg) {
  return (deg * Math.PI) / 180;
}

function DistanceInMeters(lat1, lon1, lat2, lon2) {
  var dlon = Degrees2Radians(lon2 - lon1);
  var dlat = Degrees2Radians(lat2 - lat1);
  var a =
    Math.sin(dlat / 2) * Math.sin(dlat / 2) +
    Math.cos(Degrees2Radians(lat1)) *
      Math.cos(Degrees2Radians(lat2)) *
      (Math.sin(dlon / 2) * Math.sin(dlon / 2));
  var angle = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  var meters = angle * 6371000;
  return meters;
}

function Arrived() {
  // If the truck is within 10 meters of the destination, call it good.
  if (
    DistanceInMeters(currentLat, currentLon, destinationLat, destinationLon) <
    10
  )
    return true;
  return false;
}

function UpdatePosition() {
  while (
    petSectionsCompletedTime + timeOnPath[petOnSection] < timeOnCurrentTask &&
    petOnSection < timeOnPath.length - 1
  ) {
    // Truck has moved on to the next section.
    petSectionsCompletedTime += timeOnPath[petOnSection];
    ++petOnSection;
  }

  // Ensure remainder is less than or equal to 1, because the interval may take count over what is needed.
  var remainderFraction = Math.min(
    1,
    (timeOnCurrentTask - petSectionsCompletedTime) / timeOnPath[petOnSection]
  );

  // The path should be one entry longer than the timeOnPath array.
  // Find how far along the section the truck has moved.
  currentLat =
    path[petOnSection][0] +
    remainderFraction * (path[petOnSection + 1][0] - path[petOnSection][0]);
  currentLon =
    path[petOnSection][1] +
    remainderFraction * (path[petOnSection + 1][1] - path[petOnSection][1]);
}

function GetRoute(newState) {
  // Set the state to ready, until the new route arrives.
  // Coordinates are in longitude first.
  var coordinates = [
    [currentLon, currentLat],
    [destinationLon, destinationLat],
  ];
  var results = routeURL.calculateRouteDirections(
    rest.Aborter.timeout(10000),
    coordinates
  );
  results.then(
    (data) => {
      greenMessage(
        "Route found. Number of points = " +
          JSON.stringify(data.routes[0].legs[0].points.length, null, 4)
      );

      if (data.routes[0].legs[0].points.length <= 2) {
        state = act;
        return;
      }
      // Clear the path.
      path.length = 0;

      // Start with the current location.
      path.push([currentLat, currentLon]);

      // Retrieve the route and push the points onto the array.
      for (var n = 0; n < data.routes[0].legs[0].points.length; n++) {
        var x = data.routes[0].legs[0].points[n].latitude;
        var y = data.routes[0].legs[0].points[n].longitude;
        path.push([x, y]);
      }

      // Finish with the destination.
      path.push([destinationLat, destinationLon]);

      // Store the path length and the time taken to calculate the average speed.
      var meters = data.routes[0].summary.lengthInMeters;
      var seconds = data.routes[0].summary.travelTimeInSeconds;
      var pathSpeed = meters / seconds;
      var distanceApartInMeters;
      var timeForOneSection;

      // Clear the time on the path array.
      timeOnPath.length = 0;

      // Calculate how much time is required for each section of the path.
      for (var t = 0; t < path.length - 1; t++) {
        // Calculate the distance between the two path points, in meters.
        distanceApartInMeters = DistanceInMeters(
          path[t][0],
          path[t][1],
          path[t + 1][0],
          path[t + 1][1]
        );

        // Calculate the time for each section of the path.
        timeForOneSection = distanceApartInMeters / pathSpeed;
        timeOnPath.push(timeForOneSection);
      }
      petOnSection = 0;
      petSectionsCompletedTime = 0;
      timeOnCurrentTask = 0;

      // Update the state now that the route has arrived, either enroute or returning.
      state = newState;
    },
    (reason) => {
      // Error: The request was aborted.
      redMessage(reason);
      eventText = "Failed to find map route";
    }
  );
}

function goTo(act) {
  // Pick up a variable from the request payload.
  console.log("action", act);
  // Set new customer event only when all is good.
  eventText = "New Action: " + act;
  if (act == "resting") {
    state = actEnum.rest;
    return;
  } else if (act == "sleeping") {
    state == actEnum.sleeping;
    return;
  }

  var loc;
  loc = location[act];
  console.log(loc);
  destinationLat = loc[0];
  destinationLon = loc[1];

  // Find route from current position to destination, and store route.
  GetRoute(actEnum.moving);
}

function CmdRecall(request, response) {
  switch (state) {
    case stateEnum.ready:
    case stateEnum.loading:
    case stateEnum.dumping:
      eventText = "Already at base";
      break;
    case stateEnum.returning:
      eventText = "Already returning";
      break;
    case stateEnum.delivering:
      eventText = "Unable to recall - " + state;
      break;
    case stateEnum.enroute:
      ReturnToBase();
      break;
  }

  // Acknowledge the command.
  response.send(200, "Success", function (errorMessage) {
    // Failure
    if (errorMessage) {
      redMessage(
        "Failed sending a CmdRecall response:\n" + errorMessage.message
      );
    }
  });
}

function dieRoll(max) {
  return Math.random() * max;
}

function UpdatePet() {
  // Limit max temp to outside temperature.
  timeOnCurrentTask += interval;
  switch (state) {
    case actEnum.moving:
      // Update truck position.
      UpdatePosition();

      // Check to see if the truck has arrived at the customer.
      if (Arrived()) {
        state = act;
        timeOnCurrentTask = 0;
      }
      break;
    case actEnum.eating:
      if (timeOnCurrentTask >= eatingTime) {
        // Finished dumping.
        state = actEnum.rest;
        timeOnCurrentTask = 0;
      }
      break;
    case actEnum.go2toilet:
      if (timeOnCurrentTask >= toiletTime) {
        // Finished dumping.
        state = actEnum.rest;
        timeOnCurrentTask = 0;
      }
      break;
    case actEnum.drinking:
      if (timeOnCurrentTask >= drinkingTime) {
        // Finished dumping.
        state = actEnum.rest;
        timeOnCurrentTask = 0;
        break;
      }
    case actEnum.sleeping:
      if (timeOnCurrentTask >= sleepingTime) {
        // Finished dumping.
        state = actEnum.rest;
        timeOnCurrentTask = 0;
      }
      break;
  }
}

function sendPetTelemetry() {
  // Simulate the truck.
  console.log("start of action", state);
  if (state == actEnum.resting || state == actEnum.sleeping) {
    act = action[parseInt(dieRoll(5))];

    console.log(act);
    goTo(act);
  }

  UpdatePet();

  // Create the telemetry data JSON package.
  var data = JSON.stringify({
    // Format:
    // Name from IoT Central app ":" variable name from NodeJS app.
    BodyTemperature: temp.toFixed(2),
    Action: state,
    Location: {
      // Names must be lon, lat.
      lon: currentLon,
      lat: currentLat,
    },
  });

  // Add the eventText event string, if there is one.
  if (eventText != noEvent) {
    data += JSON.stringify({
      Event: eventText,
    });
    eventText = noEvent;
  }

  // Create the message by using the preceding defined data.
  var message = new Message(data);
  console.log("Message: " + data);

  // Send the message.
  hubClient.sendEvent(message, function (errorMessage) {
    // Error
    if (errorMessage) {
      redMessage(
        "Failed to send message to Azure IoT Central: ${err.toString()}"
      );
    } else {
      greenMessage("Telemetry sent");
    }
  });
}

// Send device twin reported properties.
function sendDeviceProperties(twin, properties) {
  twin.properties.reported.update(properties, (err) =>
    greenMessage(
      `Sent device properties: ${JSON.stringify(properties)}; ` +
        (err ? `error: ${err.toString()}` : `status: success`)
    )
  );
}

// Add any writeable properties your device supports. Map them to a function that's called when the writeable property
// is updated in the IoT Central application.
var writeableProperties = {
  OptimalTemperature: (newValue, callback) => {
    setTimeout(() => {
      optimalTemperature = newValue;
      callback(newValue, "completed", 200);
    }, 1000);
  },
};

// Handle writeable property updates that come from IoT Central via the device twin.
function handleWriteablePropertyUpdates(twin) {
  twin.on("properties.desired", function (desiredChange) {
    for (let setting in desiredChange) {
      if (writeableProperties[setting]) {
        greenMessage(`Received setting: ${setting}: ${desiredChange[setting]}`);
        writeableProperties[setting](
          desiredChange[setting],
          (newValue, status, code) => {
            var patch = {
              [setting]: {
                value: newValue,
                ad: status,
                ac: code,
                av: desiredChange.$version,
              },
            };
            sendDeviceProperties(twin, patch);
          }
        );
      }
    }
  });
}

// Handle device connection to Azure IoT Central.
var connectCallback = (err) => {
  if (err) {
    redMessage(
      `Device could not connect to Azure IoT Central: ${err.toString()}`
    );
  } else {
    greenMessage("Device successfully connected to Azure IoT Central");

    // Send telemetry to Azure IoT Central every 5 seconds.
    setInterval(sendPetTelemetry, 5000);

    // Get device twin from Azure IoT Central.
    hubClient.getTwin((err, twin) => {
      if (err) {
        redMessage(`Error getting device twin: ${err.toString()}`);
      } else {
        // Send device properties once on device start up.
        var properties = {
          // Format:
          // <Property Name in Azure IoT Central> ":" <value in Node.js app>
          PetID: petIdentification,
        };
        sendDeviceProperties(twin, properties);
        handleWriteablePropertyUpdates(twin);

        hubClient.onDeviceMethod("Recall", CmdRecall);
      }
    });
  }
};

// Start the device (register and connect to Azure IoT Central).
provisioningClient.register((err, result) => {
  if (err) {
    redMessage("Error registering device: " + err);
  } else {
    greenMessage("Registration succeeded");
    console.log("Assigned hub=" + result.assignedHub);
    console.log("DeviceId=" + result.deviceId);
    var connectionString =
      "HostName=" +
      result.assignedHub +
      ";DeviceId=" +
      result.deviceId +
      ";SharedAccessKey=" +
      symmetricKey;
    hubClient = Client.fromConnectionString(connectionString, iotHubTransport);
    hubClient.open(connectCallback);
  }
});
