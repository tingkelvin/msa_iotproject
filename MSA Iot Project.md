# MSA Iot Project
## _Pet Health Monitor_

![N|Solid](https://i.ibb.co/9mx9t8r/662fdf7b-88f3-4891-aee1-2bb525a40fb4.jpg | width=100)

This is Donut. He lives in University of Adelaide. Despite his cuteness he always sneaks around in the campus. University of Adelaide is a big university. Sometime his owner has trouble of finding him.

His owner has reached us to ask for a solution to deal with this. After going through the Azure Student Acceleration Bootcamp. Here we have a solution for that.

Iot Central application + Event Hut + Power BI = Pet Health Monitor

This Iot solution will allow you to

- Track your pet position
- Monitor your pet's health 

## Features

- Monitor heartbeat and body temperature.
- Set up optimal heartbeat and body temperature, the system will warn you if these metrics drop below optimal value.
- Track your pet activity level such sleeping time, how many steps has walked, and time spent in toilet.
- Track your pet diet habit, how many water and food has drunk and eaten.
- Constantly monitor your pet's geographic location.
- Monitor to your pet if he moved out of boundary, in this case is the University of Adelaide

## Architecture
![N|Solid](https://dm2305files.storage.live.com/y4mdSTnYN3v9WST-tdy4P3z0pM7A1ek_HDo4dlar_mrBPqcSuYVrcon_UD0ArE9MuYfyBao3Znalbj1YS9liCee1EHKa0Ty5R7E_KFi4MacJ5LGsHygVp29rIur-u16Fv3FdZSYjgPzAaCR2-p4B3QdTKI9l1-GsjpGbQJ8bvlm9cJxyzYvDtPMqoBFKAlOm3zs?width=1666&height=354&cropmode=none)

Deivces
It is a electronic device that wearable on your pet that monitor his health and behaviors

IoT
Device will send telemetry data to the IoT Central which is a fully managed SaaS (software-as-a-service). This IoT Central abstract the technical choices and lets us focus on our solution exclusively.

Event Hub
IoT Hub Device Provisioning Service (DPS) is recommended for registering and connecting large sets of devices. DPS lets you assign and register devices to specific Azure IoT Hub endpoints at scale.

Azure Stream Analytics
Azure Stream Analytics is used for stream processing and rules evaluation. It is used to analysis hot path data. Hot path data must be analysed in real time and with low latency. Sudden drop of body temperature will cause serve damage to your pet. Hence we would like to stream the data with latency and closely monitor your pet.

Power BI Dashboard
Provide visualization of data such as in gauge, bar chart ...etc

## Stimulation
To better test our prototypes, we have create a script to stimulate pet behaviours. The script is located ./PetHealthMonitor/app.js

The script send the following telemetry data for every 5 seconds:
```
{
    Action: state,
    BodyTemperature: parseInt(temp),
    HeartBeat: heartbeat,
    optimalh2o: optimalWater,
    stepWalked: steps,
    timeSpentInToilet: timeIntoilet,
    waterHasDrunk: waterDrunk,
    foodHasEaten: foodEaten,
    timesHasSlept: timeSlept,
    PetInBoundary: isPetInBoundary,
    isCallMyPet: findMyPet,
    Location: {
      lon: currentLon,
      lat: currentLat,
    },
  }
```

In each literation, the action will either move randomly, eat, drink, go to toilet, sleep and rest.

If the action is "move randomly", the pet will move to a random place.

If the action is "eat", "drink" and "go to toilet", the pet will move to a food source, water source and toilet respectively.

If the action is "sleep" and "rest", the pet will stay at the same place.

The duration of the action is random. The body temperature and heart beat will increase or decrease respect to the action. To calculate the amount of food and water consumed, we measure the duration of the action. For example, if the pet stays at the water source for 5 seconds, we expect that the pet drinks 0.5 ml water.

## IoT Central Application
The overview of the application. The application will check if the pet is stay in the boundary.
![N|Solid](https://dm2305files.storage.live.com/y4m2rKa_lAEVPonue_xGOV51w257J6OSyODp-ZSWmauMkXygd1ZljnblzuzDcAEgdtseC7kF0YIUC7EIxSLnidpr2fD0ndieQTyI9wLM5xRA0N2QSiG788B_7Vibn60fkv4Ekb-aVgqXUTIyNeK0uTOSVkerNtZpZ6kXES003ssVWTjglEE1jPlPL-OrdhtM9Ye?width=2126&height=1216&cropmode=none)

Rules that define to monitor health. eg. if heartbeat drop below certain value.
![N|Solid](https://i.ibb.co/25gNjgx/Screen-Shot-2021-09-15-at-8-51-56-pm.png)

Commands:
Find my pet is command that help you to find the pet. If it is triggered, we expect the device to make some noise.
![N|Solid](https://i.ibb.co/94Sjv2V/Screen-Shot-2021-09-15-at-8-58-06-pm.png)

This command is for setting the optimal amount of water drunk for the pet. 
![N|Solid](https://i.ibb.co/MCD36cG/Screen-Shot-2021-09-15-at-8-59-29-pm.png)

## Event Hub
The setting for event hub.
![N|Solid](https://i.ibb.co/hHKcj8d/Screen-Shot-2021-09-15-at-9-11-10-pm.png)

## Azure Stream Analytics
The setting for Azure Stream Analytics.
![N|Solid](https://i.ibb.co/1X2mfyG/Screen-Shot-2021-09-15-at-9-13-21-pm.png)

## Power BI Dashboard
