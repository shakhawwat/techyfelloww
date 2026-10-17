export type KitImage={url:string;alt:string;width:number;height:number};
export type KitData={documents?:{url:string;label:string}[];images:KitImage[];skill:string;components:{component:string;quantity:number;unitPrice:number}[];compatibility:string[];extras:string[];power:string[];assembly:string[];outcomes:string[];relatedCourse:string};
export type KitPreview={demo?:boolean;priceMinor?:number;id:string;kind:'kit';title:string;summary:string;image:KitImage;kit:KitData;details:[]};
export const demoKits:KitPreview[]=[
 {
  "id": "robotics-kit",
  "kind": "kit",
  "title": "Robotics Starter Kit",
  "summary": "Explore sensing, motor control and a small mobile prototype.",
  "image": {
   "url": "/banner/iot_banner.jpg",
   "alt": "Illustrative microcontrollers, sensors and prototyping components; not an exact kit-package photo",
   "width": 6000,
   "height": 4000
  },
  "kit": {
   "images": [
    {
     "url": "/banner/iot_banner.jpg",
     "alt": "Illustrative microcontrollers, sensors and prototyping components; not an exact kit-package photo",
     "width": 6000,
     "height": 4000
    },
    {
     "url": "/banner/b1.jpg",
     "alt": "Illustrative robotics wiring and electronics; not an exact kit-package photo",
     "width": 2400,
     "height": 1713
    },
    {
     "url": "/banner/banner_1.jpg",
     "alt": "Illustrative embedded circuit board; not an exact kit-package photo",
     "width": 4000,
     "height": 3003
    }
   ],
   "skill": "Beginner",
   "components": [
    {
     "component": "Microcontroller board",
     "quantity": 1,
     "unitPrice": 900
    },
    {
     "component": "Motor driver",
     "quantity": 1,
     "unitPrice": 350
    },
    {
     "component": "Geared motor",
     "quantity": 2,
     "unitPrice": 250
    },
    {
     "component": "Chassis and wheel set",
     "quantity": 1,
     "unitPrice": 650
    },
    {
     "component": "Distance sensor",
     "quantity": 1,
     "unitPrice": 180
    },
    {
     "component": "Connection lead set",
     "quantity": 1,
     "unitPrice": 200
    }
   ],
   "compatibility": [
    "Confirm board logic levels and driver/motor compatibility.",
    "Choose a chassis and wheels that fit the selected motors."
   ],
   "extras": [
    "Development computer and USB data cable",
    "Suitable regulated power supply and safe test area"
   ],
   "power": [
    "Select a supply for the chosen motor voltage and combined current demand.",
    "Use a compatible regulator for logic power; verify polarity before connection."
   ],
   "assembly": [
    "Mount the chassis, motors and sensor; assemble and inspect wiring.",
    "Suggested tools: screwdriver, multimeter and compatible programming environment."
   ],
   "outcomes": [
    "Proposed outcome: explain sensing-to-motion behavior.",
    "Proposed project: a bounded obstacle-response prototype."
   ],
   "relatedCourse": "Robotics & IoT Foundations"
  },
  "details": []
 },
 {
  "id": "esp32-kit",
  "kind": "kit",
  "title": "ESP32 IoT Kit",
  "summary": "Prototype connected sensor telemetry and device communication.",
  "image": {
   "url": "/banner/esp32Bannetr.jpg",
   "alt": "Illustrative ESP32 board beside firmware code; not an exact kit-package photo",
   "width": 5589,
   "height": 3145
  },
  "kit": {
   "images": [
    {
     "url": "/banner/esp32Bannetr.jpg",
     "alt": "Illustrative ESP32 board beside firmware code; not an exact kit-package photo",
     "width": 5589,
     "height": 3145
    },
    {
     "url": "/banner/iot_banner.jpg",
     "alt": "Illustrative microcontrollers, sensors and prototyping components; not an exact kit-package photo",
     "width": 6000,
     "height": 4000
    },
    {
     "url": "/banner/banner_2.jpg",
     "alt": "Illustrative connected-device circuit architecture; not an exact kit-package photo",
     "width": 2600,
     "height": 2600
    }
   ],
   "skill": "Beginner to intermediate",
   "components": [
    {
     "component": "ESP32 development board",
     "quantity": 1,
     "unitPrice": 950
    },
    {
     "component": "Temperature/humidity sensor",
     "quantity": 1,
     "unitPrice": 300
    },
    {
     "component": "Breadboard",
     "quantity": 1,
     "unitPrice": 200
    },
    {
     "component": "Connection lead set",
     "quantity": 1,
     "unitPrice": 150
    },
    {
     "component": "USB data cable",
     "quantity": 1,
     "unitPrice": 200
    }
   ],
   "compatibility": [
    "Check the ESP32 variant, available pins and sensor interfaces.",
    "Confirm sensor voltage and networking/tool support."
   ],
   "extras": [
    "Development computer and compatible ESP32 tools",
    "Network access and telemetry/dashboard tools"
   ],
   "power": [
    "Use the board manufacturer’s supported USB input or regulated supply.",
    "Confirm 3.3 V logic compatibility; do not assume GPIO pins tolerate higher voltages."
   ],
   "assembly": [
    "Connect and inspect a breadboard sensor circuit.",
    "Suggested tools: multimeter, serial monitor and firmware editor."
   ],
   "outcomes": [
    "Proposed outcome: explain a device-to-dashboard workflow.",
    "Proposed project: a connected environmental-data prototype."
   ],
   "relatedCourse": "Embedded Systems with ESP32"
  },
  "details": []
 },
 {
  "id": "agriculture-kit",
  "kind": "kit",
  "title": "Smart Agriculture Kit",
  "summary": "Explore soil and environmental sensing for a small monitoring prototype.",
  "image": {
   "url": "/banner/iot_banner.jpg",
   "alt": "Illustrative microcontrollers, sensors and prototyping components; not an exact kit-package photo",
   "width": 6000,
   "height": 4000
  },
  "kit": {
   "images": [
    {
     "url": "/banner/iot_banner.jpg",
     "alt": "Illustrative microcontrollers, sensors and prototyping components; not an exact kit-package photo",
     "width": 6000,
     "height": 4000
    },
    {
     "url": "/banner/esp32Bannetr.jpg",
     "alt": "Illustrative ESP32 board beside firmware code; not an exact kit-package photo",
     "width": 5589,
     "height": 3145
    },
    {
     "url": "/banner/banner_1.jpg",
     "alt": "Illustrative embedded circuit board; not an exact kit-package photo",
     "width": 4000,
     "height": 3003
    }
   ],
   "skill": "Intermediate",
   "components": [
    {
     "component": "ESP32 development board",
     "quantity": 1,
     "unitPrice": 950
    },
    {
     "component": "Capacitive soil-moisture sensor",
     "quantity": 2,
     "unitPrice": 350
    },
    {
     "component": "Temperature/humidity sensor",
     "quantity": 1,
     "unitPrice": 300
    },
    {
     "component": "Prototype enclosure",
     "quantity": 1,
     "unitPrice": 450
    },
    {
     "component": "Breadboard and lead set",
     "quantity": 1,
     "unitPrice": 350
    }
   ],
   "compatibility": [
    "Check sensor operating voltage, signal range and calibration needs.",
    "Prototype parts are not assumed weatherproof or suitable for unattended field deployment."
   ],
   "extras": [
    "Development computer and network access",
    "Suitable power supply, test soil samples and mounting materials"
   ],
   "power": [
    "Size a regulated supply for the selected board and sensors.",
    "Keep electronics dry; confirm enclosure and protection needs before outdoor use."
   ],
   "assembly": [
    "Mount and calibrate sensors; document test conditions and wiring.",
    "Suggested tools: multimeter, firmware editor and telemetry viewer."
   ],
   "outcomes": [
    "Proposed outcome: compare sensor observations and identify calibration limits.",
    "Proposed project: a small soil/environment monitoring dashboard."
   ],
   "relatedCourse": "IoT Cloud & Automation"
  },
  "details": []
 },
 {
  "id": "line-follower-kit",
  "kind": "kit",
  "title": "Line-Follower Robot Kit",
  "summary": "Explore reflectance sensing and closed-loop path following.",
  "image": {
   "url": "/banner/b1.jpg",
   "alt": "Illustrative robotics wiring and electronics; not an exact kit-package photo",
   "width": 2400,
   "height": 1713
  },
  "kit": {
   "images": [
    {
     "url": "/banner/b1.jpg",
     "alt": "Illustrative robotics wiring and electronics; not an exact kit-package photo",
     "width": 2400,
     "height": 1713
    },
    {
     "url": "/banner/iot_banner.jpg",
     "alt": "Illustrative microcontrollers, sensors and prototyping components; not an exact kit-package photo",
     "width": 6000,
     "height": 4000
    },
    {
     "url": "/banner/banner_1.jpg",
     "alt": "Illustrative embedded circuit board; not an exact kit-package photo",
     "width": 4000,
     "height": 3003
    }
   ],
   "skill": "Beginner to intermediate",
   "components": [
    {
     "component": "Microcontroller board",
     "quantity": 1,
     "unitPrice": 900
    },
    {
     "component": "Reflectance sensor array",
     "quantity": 1,
     "unitPrice": 550
    },
    {
     "component": "Motor driver",
     "quantity": 1,
     "unitPrice": 350
    },
    {
     "component": "Geared motor",
     "quantity": 2,
     "unitPrice": 250
    },
    {
     "component": "Chassis and wheel set",
     "quantity": 1,
     "unitPrice": 650
    },
    {
     "component": "Connection lead set",
     "quantity": 1,
     "unitPrice": 200
    }
   ],
   "compatibility": [
    "Confirm sensor-array outputs, board interfaces and motor-driver ratings.",
    "Track contrast and lighting affect sensing; tune against a controlled test track."
   ],
   "extras": [
    "Suitable power supply, development computer and USB cable",
    "A test track and safe clear floor area"
   ],
   "power": [
    "Match motor voltage to the selected supply and driver.",
    "Allow for motor startup current and use compatible regulated logic power."
   ],
   "assembly": [
    "Assemble and align the chassis and sensors; inspect wiring before testing.",
    "Suggested tools: screwdriver, multimeter and programming environment."
   ],
   "outcomes": [
    "Proposed outcome: explain how sensor feedback changes motor commands.",
    "Proposed project: a tuned line-following prototype with documented limitations."
   ],
   "relatedCourse": "Robotics & IoT Foundations"
  },
  "details": []
 },
 {
  "id": "ros2-kit",
  "kind": "kit",
  "title": "ROS2 Mobile Robot Kit",
  "summary": "Explore mobile-robot integration and a proposed ROS2 navigation workflow.",
  "image": {
   "url": "/banner/b1.jpg",
   "alt": "Illustrative robotics wiring and electronics; not an exact kit-package photo",
   "width": 2400,
   "height": 1713
  },
  "kit": {
   "images": [
    {
     "url": "/banner/b1.jpg",
     "alt": "Illustrative robotics wiring and electronics; not an exact kit-package photo",
     "width": 2400,
     "height": 1713
    },
    {
     "url": "/banner/banner_1.jpg",
     "alt": "Illustrative embedded circuit board; not an exact kit-package photo",
     "width": 4000,
     "height": 3003
    },
    {
     "url": "/banner/iot_banner.jpg",
     "alt": "Illustrative microcontrollers, sensors and prototyping components; not an exact kit-package photo",
     "width": 6000,
     "height": 4000
    }
   ],
   "skill": "Intermediate",
   "components": [
    {
     "component": "Compatible single-board computer",
     "quantity": 1,
     "unitPrice": 6500
    },
    {
     "component": "Microcontroller interface board",
     "quantity": 1,
     "unitPrice": 950
    },
    {
     "component": "Encoder motor",
     "quantity": 2,
     "unitPrice": 1200
    },
    {
     "component": "Motor driver",
     "quantity": 1,
     "unitPrice": 900
    },
    {
     "component": "Mobile chassis and wheel set",
     "quantity": 1,
     "unitPrice": 2200
    },
    {
     "component": "Distance sensor",
     "quantity": 1,
     "unitPrice": 700
    },
    {
     "component": "Connection accessory set",
     "quantity": 1,
     "unitPrice": 500
    }
   ],
   "compatibility": [
    "Confirm operating-system and ROS2 support for the selected compute platform.",
    "Check encoder interfaces, driver ratings and physical mounting compatibility."
   ],
   "extras": [
    "Suitable regulated power system and storage media",
    "Development computer, networking accessories and controlled test area"
   ],
   "power": [
    "Provide separately appropriate compute and motor power with a common grounding plan.",
    "Determine actual voltage/current requirements from selected hardware specifications."
   ],
   "assembly": [
    "Assemble the drive base and validate each interface before integrating ROS2.",
    "Suggested tools: screwdriver set, multimeter, firmware tools and ROS2-compatible software."
   ],
   "outcomes": [
    "Proposed outcome: explain robot-node and hardware-interface responsibilities.",
    "Proposed project: a bounded mobile-robot integration and navigation experiment."
   ],
   "relatedCourse": "ROS2 & Autonomous Robotics"
  },
  "details": []
 },
 {
  "id": "vision-kit",
  "kind": "kit",
  "title": "AI Vision Prototype Kit",
  "summary": "Explore camera capture and model inference in a bounded visual prototype.",
  "image": {
   "url": "/banner/aibanner3.jpg",
   "alt": "Illustrative AI processor and circuit architecture; not an exact kit-package photo",
   "width": 5120,
   "height": 2880
  },
  "kit": {
   "images": [
    {
     "url": "/banner/aibanner3.jpg",
     "alt": "Illustrative AI processor and circuit architecture; not an exact kit-package photo",
     "width": 5120,
     "height": 2880
    },
    {
     "url": "/banner/banner_1.jpg",
     "alt": "Illustrative embedded circuit board; not an exact kit-package photo",
     "width": 4000,
     "height": 3003
    },
    {
     "url": "/banner/b1.jpg",
     "alt": "Illustrative robotics wiring and electronics; not an exact kit-package photo",
     "width": 2400,
     "height": 1713
    }
   ],
   "skill": "Intermediate",
   "components": [
    {
     "component": "Compatible compute board",
     "quantity": 1,
     "unitPrice": 6500
    },
    {
     "component": "Supported camera",
     "quantity": 1,
     "unitPrice": 1800
    },
    {
     "component": "Camera mount",
     "quantity": 1,
     "unitPrice": 450
    },
    {
     "component": "Storage media",
     "quantity": 1,
     "unitPrice": 700
    },
    {
     "component": "Connection accessory set",
     "quantity": 1,
     "unitPrice": 400
    }
   ],
   "compatibility": [
    "Check camera interfaces, drivers and model-runtime support.",
    "Inference performance and thermals need evaluation for the chosen workload."
   ],
   "extras": [
    "Appropriate power supply and development computer",
    "Permitted example model, test inputs and controlled test environment"
   ],
   "power": [
    "Use the compute platform’s specified regulated supply.",
    "Account for camera load and cooling requirements; verify the selected hardware specifications."
   ],
   "assembly": [
    "Mount the camera, connect interfaces and verify image capture before inference.",
    "Suggested tools: screwdriver, runtime tools and camera diagnostics."
   ],
   "outcomes": [
    "Proposed outcome: describe an image-to-inference workflow and its limitations.",
    "Proposed project: a bounded visual-observation prototype."
   ],
   "relatedCourse": "AI & Computer Vision for Robotics"
  },
  "details": []
 }
];
export function kitTotal(kit:KitData){return kit.components.reduce((total,line)=>total+line.quantity*line.unitPrice,0);}
export function bdt(value:number){return `৳${value.toLocaleString('en-US')}`;}
