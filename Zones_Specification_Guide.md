# BlindEye Multi-Sensory Zone Specification & Configuration Guide

This document outlines the **Must-Have Interaction Zones** for the BlindEye platform. It specifies the exact coordinates (in percentages), trigger gestures, and contextual actions for every primary screen in the application.

---

## 📐 Universal Ergonomic Architecture (Standard 3-Zone Model)

Every BlindEye screen follows a standardized 3-tier vertical division to ensure predictable spatial awareness:

```
+-------------------------------------------------------------+  0% Height
|  ZONE 1: TOP STATUS & CONTEXT BAR                           |
|  (Time, Battery %, Connection, Screen Title, Quick Hotspots) |  20% Height
+-------------------------------------------------------------+
|                                                             |
|  ZONE 2: CENTER CONTENT & EXPLORATION VIEWPORT              |
|  (SMS Body, Contact Info, Camera OCR Viewfinder, GPS Guide) |
|                                                             |  75% Height
+-------------------------------------------------------------+
|  ZONE 3: 120PX FIXED NAVIGATION TRACKPAD                    |
|  (Next Item, Prev Item, Select / Double-Tap, Back to Menu)  |  100% Height
+-------------------------------------------------------------+
```

---

## 🎯 Screen-by-Screen Must-Have Zone Directory

---

### 1. 🏠 Main Menu (`mainMenuScreen`)

| Zone ID | Zone Name | Coordinates (x, y, w, h) | Gesture | Action / Voice Feedback |
| :--- | :--- | :--- | :--- | :--- |
| `zone_menu_status` | **Top Status Bar** | `x: 0%, y: 0%, w: 100%, h: 18%` | `TAP` | **`TRIGGER_TTS`**: *"Main Menu. Time is [TIME]. Battery is [LEVEL]%. 5 categories available."* |
| `zone_menu_card` | **Category Hero Card** | `x: 5%, y: 20%, w: 90%, h: 55%` | `DOUBLE_TAP` | **`SELECT_ITEM`**: *"Opening selected category."* |
| `zone_menu_nav` | **Bottom Navigation Bar** | `x: 0%, y: 78%, w: 100%, h: 22%` | `SWIPE_RIGHT`<br>`SWIPE_LEFT` <br> `DOUBLE_TAP` | **`NAVIGATE_NEXT`**: Next category.<br>**`NAVIGATE_PREV`**: Previous category. <br>**`SELECT_ITEM`**: Opening selected category.|

---

### 2. 💬 Messages & SMS View (`messagesView`)

| Zone ID | Zone Name | Coordinates (x, y, w, h) | Gesture | Action / Voice Feedback |
| :--- | :--- | :--- | :--- | :--- |
| `zone_msg_sender` | **Top Sender Header** | `x: 0%, y: 0%, w: 100%, h: 18%` | `TAP` | **`TRIGGER_TTS`**: *"Message from [SENDER]. Received at [TIME]. Status: [READ/UNREAD]."* |
| `zone_msg_body` | **Message Body Reader** | `x: 5%, y: 20%, w: 90%, h: 42%` | `DOUBLE_TAP`<br>`LONG_PRESS` | **`READ_MESSAGE`**: Reads full text aloud.<br>**`PLAY_MORSE`**: Vibrates text in Morse motor pulses for deaf-blind users. |
| `zone_msg_reply` | **Voice Reply Quick Bar** | `x: 5%, y: 64%, w: 90%, h: 12%` | `DOUBLE_TAP` | **`TRIGGER_TTS`**: *"Voice recorder started. Speak your reply now."* |
| `zone_msg_nav` | **Bottom Navigation Bar** | `x: 0%, y: 78%, w: 100%, h: 22%` | `SWIPE_RIGHT`<br>`SWIPE_LEFT`<br>`LONG_PRESS` | **`NAVIGATE_NEXT`**: Next message.<br>**`NAVIGATE_PREV`**: Previous message.<br>**`NAVIGATE`**: Return to Main Menu. |

---

### 3. 📞 Phone & Contacts View (`phoneView` / `callsScreen`)

| Zone ID | Zone Name | Coordinates (x, y, w, h) | Gesture | Action / Voice Feedback |
| :--- | :--- | :--- | :--- | :--- |
| `zone_phone_emergency` | **Top Emergency Star** | `x: 70%, y: 0%, w: 30%, h: 18%` | `DOUBLE_TAP` | **`CALL_CONTACT`**: *"Speed dial: Calling designated emergency contact immediately."* |
| `zone_phone_contact` | **Contact Info Card** | `x: 5%, y: 20%, w: 90%, h: 42%` | `DOUBLE_TAP` | **`CALL_CONTACT`**: *"Calling [CONTACT_NAME] on [PHONE_NUMBER]."* |
| `zone_phone_keypad` | **Tactile Dialer Strip** | `x: 5%, y: 64%, w: 90%, h: 12%` | `DOUBLE_TAP` | **`NAVIGATE`**: *"Opening keypad dialer for manual number entry."* |
| `zone_phone_nav` | **Bottom Navigation Bar** | `x: 0%, y: 78%, w: 100%, h: 22%` | `SWIPE_RIGHT`<br>`SWIPE_LEFT`<br>`LONG_PRESS` | **`NAVIGATE_NEXT`**: Next contact.<br>**`NAVIGATE_PREV`**: Previous contact.<br>**`NAVIGATE`**: Return to Main Menu. |

---

### 4. 📷 Camera & AI Vision View (`cameraView` / `cameraScreen`)

| Zone ID | Zone Name | Coordinates (x, y, w, h) | Gesture | Action / Voice Feedback |
| :--- | :--- | :--- | :--- | :--- |
| `zone_cam_flash` | **Top Flashlight Hotspot** | `x: 65%, y: 0%, w: 35%, h: 18%` | `TAP` | **`TRIGGER_TTS`**: *"Camera flashlight toggled on/off."* |
| `zone_cam_viewfinder` | **Center OCR Viewfinder** | `x: 5%, y: 20%, w: 90%, h: 45%` | `DOUBLE_TAP`<br>`SWIPE_UP` | **`AI_OCR_SCAN`**: *"Capturing snapshot and reading printed text aloud."*<br>**`AI_SCENE_DESCRIBE`**: *"Analyzing environment scene and obstacles ahead."* |
| `zone_cam_trigger` | **Snapshot Read Button** | `x: 5%, y: 67%, w: 90%, h: 10%` | `DOUBLE_TAP` | **`AI_OCR_SCAN`**: *"Scanning text in view."* |
| `zone_cam_nav` | **Bottom Navigation Bar** | `x: 0%, y: 78%, w: 100%, h: 22%` | `LONG_PRESS` | **`NAVIGATE`**: Return to Main Menu. |

---

### 5. 📍 GPS Audio Navigation View (`navigationView` / `navigationScreen`)

| Zone ID | Zone Name | Coordinates (x, y, w, h) | Gesture | Action / Voice Feedback |
| :--- | :--- | :--- | :--- | :--- |
| `zone_nav_gps_status` | **Top GPS Accuracy Header** | `x: 0%, y: 0%, w: 100%, h: 18%` | `TAP` | **`TRIGGER_TTS`**: *"Current GPS fix: Lat [LAT], Lng [LNG], accurate to 3 meters."* |
| `zone_nav_directive` | **Turn-by-Turn Card** | `x: 5%, y: 20%, w: 90%, h: 42%` | `TAP`<br>`DOUBLE_TAP` | **`TRIGGER_TTS`**: Replays current walking instruction.<br>**`START_GPS_GUIDE`**: Starts walking navigation route. |
| `zone_nav_advance` | **Next Step Button** | `x: 5%, y: 64%, w: 90%, h: 12%` | `DOUBLE_TAP` | **`NAVIGATE_NEXT`**: Advances to the next walking step. |
| `zone_nav_nav` | **Bottom Navigation Bar** | `x: 0%, y: 78%, w: 100%, h: 22%` | `SWIPE_RIGHT`<br>`SWIPE_LEFT`<br>`LONG_PRESS` | **`NAVIGATE_NEXT`**: Next saved place.<br>**`NAVIGATE_PREV`**: Previous saved place.<br>**`NAVIGATE`**: Return to Main Menu. |

---

### 6. ⚙️ Settings & Preferences (`settingsView` / `settingsScreen`)

| Zone ID | Zone Name | Coordinates (x, y, w, h) | Gesture | Action / Voice Feedback |
| :--- | :--- | :--- | :--- | :--- |
| `zone_settings_header` | **Top Preference Title** | `x: 0%, y: 0%, w: 100%, h: 18%` | `TAP` | **`TRIGGER_TTS`**: *"System Preferences. Tap option card to cycle."* |
| `zone_settings_card` | **Option Toggle Card** | `x: 5%, y: 20%, w: 90%, h: 55%` | `DOUBLE_TAP` | **`SELECT_ITEM`**: Cycles option value (e.g. *Voice Only ➔ Morse Only ➔ Combined*). |
| `zone_settings_nav` | **Bottom Navigation Bar** | `x: 0%, y: 78%, w: 100%, h: 22%` | `SWIPE_RIGHT`<br>`SWIPE_LEFT`<br>`LONG_PRESS` | **`NAVIGATE_NEXT`**: Next setting item.<br>**`NAVIGATE_PREV`**: Previous setting item.<br>**`NAVIGATE`**: Return to Main Menu. |

---

### 7. 🚨 Emergency SOS Screen (`sosScreen`)

| Zone ID | Zone Name | Coordinates (x, y, w, h) | Gesture | Action / Voice Feedback |
| :--- | :--- | :--- | :--- | :--- |
| `zone_sos_trigger` | **Full Emergency Surface** | `x: 0%, y: 0%, w: 100%, h: 75%` | `DOUBLE_TAP`<br>`TWO_FINGER_TAP` | **`DISPATCH_SOS`**: *"Emergency alert dispatched with live GPS coordinates to Mother and 112 emergency services."* |
| `zone_sos_cancel` | **Bottom Cancel Zone** | `x: 0%, y: 78%, w: 100%, h: 22%` | `TAP`<br>`LONG_PRESS` | **`TRIGGER_TTS`**: *"Emergency countdown cancelled. Returning to safety."* |

---

### 8. 📳 Deaf-Blind Morse Keyboard Mode (`morseInputView`)

| Zone ID | Zone Name | Coordinates (x, y, w, h) | Gesture | Action / Voice Feedback |
| :--- | :--- | :--- | :--- | :--- |
| `zone_morse_dot` | **Left Half (Dot .)** | `x: 0%, y: 0%, w: 50%, h: 78%` | `TAP` | Input Morse **Dot (.)** with short 40ms motor pulse. |
| `zone_morse_dash` | **Right Half (Dash -)** | `x: 50%, y: 0%, w: 50%, h: 78%` | `TAP` | Input Morse **Dash (-)** with long 160ms motor pulse. |
| `zone_morse_controls` | **Bottom Control Bar** | `x: 0%, y: 78%, w: 100%, h: 22%` | `SWIPE_RIGHT`<br>`SWIPE_LEFT`<br>`SWIPE_UP` | **Space** character.<br>**Delete / Backspace** character.<br>**Send** message. |

---

## 🚀 Quick Setup Instructions in AI Programmer Workbench

1. Open **[http://localhost:3000/](http://localhost:3000/)** and click the **AI Programmer** tab.
2. Select the **Screen** you want to configure (e.g. `messagesView`).
3. Drag the boxes on the phone mockup matching the coordinates above:
   - **Top Zone** (Top 20%) ➔ Name: `Top Header Zone` ➔ Click **Save zone**.
   - **Center Zone** (Middle 55%) ➔ Name: `Center Content Zone` ➔ Click **Save zone**.
   - **Bottom Zone** (Bottom 25%) ➔ Name: `Bottom Nav Bar Zone` ➔ Click **Save zone**.
4. In **Step 2 (Scenario Builder)**, pick each zone, choose your gesture and function from the table above, and click **SAVE SCENARIO & BROADCAST LIVE**.
