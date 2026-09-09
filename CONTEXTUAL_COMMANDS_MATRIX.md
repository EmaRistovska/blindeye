# BlindEye Contextual Gesture Commands Matrix

> **Total Screens:** 39  
> **Total Contextual Gesture Commands:** 215  
> **Generated:** 2026-08-19T10:02:18.109Z  
> **Purpose:** Source of truth for editing, reviewing, and updating gesture actions, haptic patterns, and spoken audio responses.

---

## Screen: Accessibility Preferences (`settingsAccessibilityMenu`)
- **Parent Hierarchy:** `settingsCategoryMenu`
- **Commands Count:** 6

| Command ID | Gesture Code | Zone / Sub-Context | Action Type | Target Screen | Haptic Pattern | Spoken TTS Feedback |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `cmd_seta1` | `SWIPE_RIGHT` | `DEFAULT` | `NAVIGATE_NEXT` | `—` | `short` | *"Vibration Intensity. Current value: Medium. Double tap to cycle."* |
| `cmd_seta2` | `SWIPE_LEFT` | `DEFAULT` | `NAVIGATE_PREV` | `—` | `short` | *"Privacy Mode. Current value: OFF. Double tap to cycle."* |
| `cmd_seta3` | `DOUBLE_TAP` | `DEFAULT` | `CYCLE_SETTING` | `—` | `success` | *"Reading mode changed to Combined Voice and Morse."* |
| `cmd_seta4` | `LONG_PRESS` | `DEFAULT` | `NAVIGATE` | `settingsCategoryMenu` | `short` | *"Returned to Settings Menu."* |
| `cmd_seta5` | `SWIPE_DOWN` | `DEFAULT` | `NAVIGATE` | `settingsCategoryMenu` | `short` | *"Returned to Settings Menu."* |
| `cmd_1786965716000` | `TWO_FINGER_TAP` | `zone_top_status_bar_global` | `TRIGGER_TTS` | `zone_top_status_bar_global` | `success` | *"Main Menu. Time is 13:24. Battery is 100%."* |

---

## Screen: Active Connected Call (`activeCallScreen`)
- **Parent Hierarchy:** `Root`
- **Commands Count:** 3

| Command ID | Gesture Code | Zone / Sub-Context | Action Type | Target Screen | Haptic Pattern | Spoken TTS Feedback |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `cmd_call1` | `DOUBLE_TAP` | `DEFAULT` | `END_CALL` | `phoneCategoryMenu` | `error` | *"Call ended. Returned to phone menu."* |
| `cmd_call2` | `LONG_PRESS` | `DEFAULT` | `END_CALL` | `phoneCategoryMenu` | `error` | *"Call ended. Returned to phone menu."* |
| `cmd_call3` | `SWIPE_DOWN` | `DEFAULT` | `END_CALL` | `phoneCategoryMenu` | `error` | *"Call ended. Returned to phone menu."* |

---

## Screen: GPS Walking Route Active (`navActiveRouteScreen`)
- **Parent Hierarchy:** `navCategoryMenu`
- **Commands Count:** 3

| Command ID | Gesture Code | Zone / Sub-Context | Action Type | Target Screen | Haptic Pattern | Spoken TTS Feedback |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `cmd_navrt1` | `SWIPE_RIGHT` | `DEFAULT` | `ADVANCE_STEP` | `—` | `short` | *"Next navigation step."* |
| `cmd_navrt2` | `DOUBLE_TAP` | `DEFAULT` | `ADVANCE_STEP` | `—` | `success` | *"Step confirmed. Continuing route."* |
| `cmd_navrt4` | `SWIPE_DOWN` | `DEFAULT` | `STOP_ROUTE` | `navPlaceActionMenuScreen` | `warning` | *"Navigation route stopped. Returned to place options."* |

---

## Screen: Biometric Device Login (`onboardingAuthScreen`)
- **Parent Hierarchy:** `Root`
- **Commands Count:** 0

*No contextual commands configured yet for this screen.*

## Screen: Camera Categories Menu (`cameraCategoryMenu`)
- **Parent Hierarchy:** `mainMenuScreen`
- **Commands Count:** 9

| Command ID | Gesture Code | Zone / Sub-Context | Action Type | Target Screen | Haptic Pattern | Spoken TTS Feedback |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `cmd_cameraCategoryMenu_1` | `SWIPE_RIGHT` | `DEFAULT` | `NAVIGATE_NEXT` | `—` | `short` | *"Scan Objects. Hold camera for 3s to describe scene and obstacles. Double tap to start."* |
| `cmd_cameraCategoryMenu_2` | `SWIPE_LEFT` | `DEFAULT` | `NAVIGATE_PREV` | `—` | `short` | *"Read Text OCR. Hold camera for 3s to read printed text. Double tap to start."* |
| `cmd_cameraCategoryMenu_3` | `DOUBLE_TAP` | `DEFAULT` | `SELECT_ITEM` | `cameraActiveHoldScreen` | `success` | *"Starting camera. Hold steady for 3 seconds to capture."* |
| `cmd_cameraCategoryMenu_4` | `LONG_PRESS` | `DEFAULT` | `NAVIGATE` | `mainMenuScreen` | `short` | *"Returning to Main Menu."* |
| `cmd_cameraCategoryMenu_5` | `SWIPE_DOWN` | `DEFAULT` | `NAVIGATE` | `mainMenuScreen` | `short` | *"Returning to Main Menu."* |
| `cmd_1786975282315` | `DOUBLE_TAP` | `zone_bottom_navigation_bar_global` | `SELECT_ITEM` | `zone_bottom_navigation_bar_global` | `success` | *"Opening category."* |
| `cmd_1786975222696` | `LONG_PRESS` | `zone_bottom_navigation_bar_global` | `NAVIGATE` | `zone_bottom_navigation_bar_global` | `success` | *"Return to Camera."* |
| `cmd_1786975106687` | `SWIPE_LEFT` | `zone_bottom_navigation_bar_global` | `NAVIGATE_PREV` | `zone_bottom_navigation_bar_global` | `success` | *"Previous camera category."* |
| `cmd_1786975092972` | `SWIPE_RIGHT` | `zone_bottom_navigation_bar_global` | `NAVIGATE_NEXT` | `zone_bottom_navigation_bar_global` | `success` | *"Next camera category."* |

---

## Screen: Camera Hold & Auto Capture (`cameraActiveHoldScreen`)
- **Parent Hierarchy:** `cameraCategoryMenu`
- **Commands Count:** 4

| Command ID | Gesture Code | Zone / Sub-Context | Action Type | Target Screen | Haptic Pattern | Spoken TTS Feedback |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `cmd_camh1` | `DOUBLE_TAP` | `DEFAULT` | `AI_OCR_SCAN` | `cameraResultScreen` | `success` | *"Capturing photo and scanning text with AI vision..."* |
| `cmd_camh3` | `SWIPE_DOWN` | `DEFAULT` | `NAVIGATE` | `cameraCategoryMenu` | `short` | *"Returned to Camera Menu."* |
| `cmd_camh4` | `LONG_PRESS` | `DEFAULT` | `NAVIGATE` | `cameraCategoryMenu` | `short` | *"Returned to Camera Menu."* |
| `cmd_1787058034963` | `LONG_PRESS` | `zone_bottom_navigation_bar_global` | `NAVIGATE` | `zone_bottom_navigation_bar_global` | `success` | *"Return to Camera."* |

---

## Screen: Camera OCR / Scene Result (`cameraResultScreen`)
- **Parent Hierarchy:** `cameraCategoryMenu`
- **Commands Count:** 6

| Command ID | Gesture Code | Zone / Sub-Context | Action Type | Target Screen | Haptic Pattern | Spoken TTS Feedback |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `cmd_camr1` | `DOUBLE_TAP` | `DEFAULT` | `NAVIGATE` | `cameraActiveHoldScreen` | `short` | *"Retaking photo. Hold camera steady."* |
| `cmd_camr2` | `SWIPE_RIGHT` | `DEFAULT` | `TRIGGER_TTS` | `—` | `short` | *"Replaying recognized text."* |
| `cmd_camr3` | `SWIPE_LEFT` | `DEFAULT` | `PLAY_MORSE` | `—` | `warning` | *"Playing Morse vibration sequence."* |
| `cmd_camr4` | `LONG_PRESS` | `DEFAULT` | `NAVIGATE` | `cameraCategoryMenu` | `short` | *"Returned to Camera Menu."* |
| `cmd_camr5` | `SWIPE_DOWN` | `DEFAULT` | `NAVIGATE` | `cameraCategoryMenu` | `short` | *"Returned to Camera Menu."* |
| `cmd_1787058053914` | `LONG_PRESS` | `zone_bottom_navigation_bar_global` | `NAVIGATE` | `zone_bottom_navigation_bar_global` | `success` | *"Return to Camera."* |

---

## Screen: Camera Screen (`cameraScreen`)
- **Parent Hierarchy:** `mainMenuScreen`
- **Commands Count:** 5

| Command ID | Gesture Code | Zone / Sub-Context | Action Type | Target Screen | Haptic Pattern | Spoken TTS Feedback |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `cmd_cameraScreen_1` | `SWIPE_RIGHT` | `DEFAULT` | `NAVIGATE_NEXT` | `—` | `short` | *"Scan Objects. Hold camera for 3s to describe scene and obstacles. Double tap to start."* |
| `cmd_cameraScreen_2` | `SWIPE_LEFT` | `DEFAULT` | `NAVIGATE_PREV` | `—` | `short` | *"Read Text OCR. Hold camera for 3s to read printed text. Double tap to start."* |
| `cmd_cameraScreen_3` | `DOUBLE_TAP` | `DEFAULT` | `SELECT_ITEM` | `cameraActiveHoldScreen` | `success` | *"Starting camera. Hold steady for 3 seconds to capture."* |
| `cmd_cameraScreen_4` | `LONG_PRESS` | `DEFAULT` | `NAVIGATE` | `mainMenuScreen` | `short` | *"Returning to Main Menu."* |
| `cmd_cameraScreen_5` | `SWIPE_DOWN` | `DEFAULT` | `NAVIGATE` | `mainMenuScreen` | `short` | *"Returning to Main Menu."* |

---

## Screen: Camera View (`cameraView`)
- **Parent Hierarchy:** `mainMenuScreen`
- **Commands Count:** 7

| Command ID | Gesture Code | Zone / Sub-Context | Action Type | Target Screen | Haptic Pattern | Spoken TTS Feedback |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `cmd_cameraView_1` | `SWIPE_RIGHT` | `DEFAULT` | `NAVIGATE_NEXT` | `—` | `short` | *"Scan Objects. Hold camera for 3s to describe scene and obstacles. Double tap to start."* |
| `cmd_cameraView_2` | `SWIPE_LEFT` | `DEFAULT` | `NAVIGATE_PREV` | `—` | `short` | *"Read Text OCR. Hold camera for 3s to read printed text. Double tap to start."* |
| `cmd_cameraView_3` | `DOUBLE_TAP` | `DEFAULT` | `SELECT_ITEM` | `cameraActiveHoldScreen` | `success` | *"Starting camera. Hold steady for 3 seconds to capture."* |
| `cmd_cameraView_4` | `LONG_PRESS` | `DEFAULT` | `NAVIGATE` | `mainMenuScreen` | `short` | *"Returning to Main Menu."* |
| `cmd_cameraView_5` | `SWIPE_DOWN` | `DEFAULT` | `NAVIGATE` | `mainMenuScreen` | `short` | *"Returning to Main Menu."* |
| `cmd_c2` | `SWIPE_UP` | `DEFAULT` | `AI_SCENE_DESCRIBE` | `—` | `long` | *"Analyzing environment scene and obstacles in front."* |
| `cmd_1786975067190` | `DOUBLE_TAP` | `zone_bottom_navigation_bar_global` | `SELECT_ITEM` | `zone_bottom_navigation_bar_global` | `success` | *"Opening camera categories."* |

---

## Screen: Contact Actions Menu (`contactActionMenuScreen`)
- **Parent Hierarchy:** `contactsListScreen`
- **Commands Count:** 4

| Command ID | Gesture Code | Zone / Sub-Context | Action Type | Target Screen | Haptic Pattern | Spoken TTS Feedback |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `cmd_1786974495596` | `LONG_PRESS` | `zone_bottom_navigation_bar_global` | `NAVIGATE` | `zone_bottom_navigation_bar_global` | `success` | *"Return to Contacts."* |
| `cmd_1786974408840` | `SWIPE_LEFT` | `zone_bottom_navigation_bar_global` | `NAVIGATE_PREV` | `zone_bottom_navigation_bar_global` | `success` | *"Previous contact action."* |
| `cmd_1786974391700` | `SWIPE_RIGHT` | `zone_bottom_navigation_bar_global` | `NAVIGATE_NEXT` | `zone_bottom_navigation_bar_global` | `success` | *"Next contact action."* |
| `cmd_1786973103174` | `DOUBLE_TAP` | `zone_bottom_navigation_bar_global` | `SELECT_ITEM` | `zone_bottom_navigation_bar_global` | `success` | *"Executing contact action."* |

---

## Screen: Contacts Directory (`contactsListScreen`)
- **Parent Hierarchy:** `phoneCategoryMenu`
- **Commands Count:** 9

| Command ID | Gesture Code | Zone / Sub-Context | Action Type | Target Screen | Haptic Pattern | Spoken TTS Feedback |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `cmd_cnt1` | `SWIPE_RIGHT` | `DEFAULT` | `NAVIGATE_NEXT` | `—` | `short` | *"Doctor Office. Phone: +389 72 555 112. Double tap for action menu."* |
| `cmd_cnt2` | `SWIPE_LEFT` | `DEFAULT` | `NAVIGATE_PREV` | `—` | `short` | *"Mother. Phone: +389 70 123 456. Double tap for action menu."* |
| `cmd_cnt3` | `DOUBLE_TAP` | `DEFAULT` | `SELECT_ITEM` | `contactActionMenuScreen` | `success` | *"Opening contact actions menu."* |
| `cmd_cnt4` | `LONG_PRESS` | `DEFAULT` | `NAVIGATE` | `phoneCategoryMenu` | `short` | *"Returned to Phone Menu."* |
| `cmd_cnt5` | `SWIPE_DOWN` | `DEFAULT` | `NAVIGATE` | `phoneCategoryMenu` | `short` | *"Returned to Phone Menu."* |
| `cmd_1786974328700` | `LONG_PRESS` | `zone_bottom_navigation_bar_global` | `NAVIGATE` | `zone_bottom_navigation_bar_global` | `success` | *"Return to Phone."* |
| `cmd_1786974284737` | `SWIPE_LEFT` | `zone_bottom_navigation_bar_global` | `NAVIGATE_PREV` | `zone_bottom_navigation_bar_global` | `success` | *"Previous contact."* |
| `cmd_1786974269592` | `SWIPE_RIGHT` | `zone_bottom_navigation_bar_global` | `NAVIGATE_NEXT` | `zone_bottom_navigation_bar_global` | `success` | *"Next contact."* |
| `cmd_1786973038535` | `DOUBLE_TAP` | `zone_bottom_navigation_bar_global` | `SELECT_ITEM` | `zone_bottom_navigation_bar_global` | `success` | *"Opening contact action menu."* |

---

## Screen: Create Quick Action (`settingsAddQuickActionScreen`)
- **Parent Hierarchy:** `settingsQuickAccessScreen`
- **Commands Count:** 0

*No contextual commands configured yet for this screen.*

## Screen: Dialer Call Confirmation (`dialerCallConfirmScreen`)
- **Parent Hierarchy:** `handwritingDialerScreen`
- **Commands Count:** 1

| Command ID | Gesture Code | Zone / Sub-Context | Action Type | Target Screen | Haptic Pattern | Spoken TTS Feedback |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `cmd_1786973210760` | `DOUBLE_TAP` | `zone_bottom_navigation_bar_global` | `CALL_CONTACT` | `zone_bottom_navigation_bar_global` | `success` | *"Calling number now."* |

---

## Screen: Emergency Contacts List (`emergencyContactsListScreen`)
- **Parent Hierarchy:** `phoneCategoryMenu`
- **Commands Count:** 9

| Command ID | Gesture Code | Zone / Sub-Context | Action Type | Target Screen | Haptic Pattern | Spoken TTS Feedback |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `cmd_emg1` | `SWIPE_RIGHT` | `DEFAULT` | `NAVIGATE_NEXT` | `—` | `short` | *"Emergency service: 112 Police & Ambulance. Double tap to call."* |
| `cmd_emg2` | `SWIPE_LEFT` | `DEFAULT` | `NAVIGATE_PREV` | `—` | `short` | *"Emergency contact: Mother. Phone: +389 70 123 456. Double tap to call."* |
| `cmd_emg3` | `DOUBLE_TAP` | `DEFAULT` | `CALL_CONTACT` | `activeCallScreen` | `success` | *"Speed dial: Calling Mother immediately."* |
| `cmd_emg4` | `LONG_PRESS` | `DEFAULT` | `NAVIGATE` | `phoneCategoryMenu` | `short` | *"Returned to Phone Menu."* |
| `cmd_emg5` | `SWIPE_DOWN` | `DEFAULT` | `NAVIGATE` | `phoneCategoryMenu` | `short` | *"Returned to Phone Menu."* |
| `cmd_1786974761284` | `LONG_PRESS` | `zone_bottom_navigation_bar_global` | `NAVIGATE` | `zone_bottom_navigation_bar_global` | `success` | *"Return to Phone."* |
| `cmd_1786974736223` | `SWIPE_LEFT` | `zone_bottom_navigation_bar_global` | `NAVIGATE_PREV` | `zone_bottom_navigation_bar_global` | `success` | *"Previous emergency contact."* |
| `cmd_1786974719507` | `SWIPE_RIGHT` | `zone_bottom_navigation_bar_global` | `NAVIGATE_NEXT` | `zone_bottom_navigation_bar_global` | `success` | *"Next emergency contact."* |
| `cmd_1786973144636` | `DOUBLE_TAP` | `zone_bottom_navigation_bar_global` | `CALL_CONTACT` | `zone_bottom_navigation_bar_global` | `success` | *"Calling emergency contact."* |

---

## Screen: Emergency SOS Countdown & Dispatch (`sosScreen`)
- **Parent Hierarchy:** `Root`
- **Commands Count:** 4

| Command ID | Gesture Code | Zone / Sub-Context | Action Type | Target Screen | Haptic Pattern | Spoken TTS Feedback |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `cmd_sos1` | `DOUBLE_TAP` | `DEFAULT` | `CANCEL_SOS` | `mainMenuScreen` | `warning` | *"SOS emergency countdown cancelled. Returning to safety."* |
| `cmd_sos2` | `LONG_PRESS` | `DEFAULT` | `DISPATCH_SOS` | `—` | `sos` | *"Emergency alert dispatched immediately to Mother and 112 emergency services with live GPS."* |
| `cmd_sos3` | `TWO_FINGER_TAP` | `DEFAULT` | `DISPATCH_SOS` | `—` | `sos` | *"Emergency alert dispatched immediately to Mother and 112 emergency services with live GPS."* |
| `cmd_sos4` | `SWIPE_DOWN` | `DEFAULT` | `CANCEL_SOS` | `mainMenuScreen` | `warning` | *"SOS emergency countdown cancelled. Returning to safety."* |

---

## Screen: Favorite Contacts (`favoritesListScreen`)
- **Parent Hierarchy:** `phoneCategoryMenu`
- **Commands Count:** 9

| Command ID | Gesture Code | Zone / Sub-Context | Action Type | Target Screen | Haptic Pattern | Spoken TTS Feedback |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `cmd_fav1` | `SWIPE_RIGHT` | `DEFAULT` | `NAVIGATE_NEXT` | `—` | `short` | *"Favorite contact: Caregiver Elena. Phone: +389 75 999 888. Double tap to call."* |
| `cmd_fav2` | `SWIPE_LEFT` | `DEFAULT` | `NAVIGATE_PREV` | `—` | `short` | *"Favorite contact: Mother. Phone: +389 70 123 456. Double tap to call."* |
| `cmd_fav3` | `DOUBLE_TAP` | `DEFAULT` | `CALL_CONTACT` | `activeCallScreen` | `success` | *"Calling Mother now."* |
| `cmd_fav4` | `LONG_PRESS` | `DEFAULT` | `NAVIGATE` | `phoneCategoryMenu` | `short` | *"Returned to Phone Menu."* |
| `cmd_fav5` | `SWIPE_DOWN` | `DEFAULT` | `NAVIGATE` | `phoneCategoryMenu` | `short` | *"Returned to Phone Menu."* |
| `cmd_1787057855936` | `SWIPE_LEFT` | `zone_bottom_navigation_bar_global` | `NAVIGATE_PREV` | `zone_bottom_navigation_bar_global` | `success` | *"Previous favorite contact."* |
| `cmd_1787057836531` | `SWIPE_RIGHT` | `zone_bottom_navigation_bar_global` | `NAVIGATE_NEXT` | `zone_bottom_navigation_bar_global` | `success` | *"Next favorite contact."* |
| `cmd_1786974644342` | `LONG_PRESS` | `zone_bottom_navigation_bar_global` | `NAVIGATE` | `zone_bottom_navigation_bar_global` | `success` | *"Return to Phone."* |
| `cmd_1786973124449` | `DOUBLE_TAP` | `zone_bottom_navigation_bar_global` | `CALL_CONTACT` | `zone_bottom_navigation_bar_global` | `success` | *"Calling favorite contact."* |

---

## Screen: Handwriting Keypad Dialer (`handwritingDialerScreen`)
- **Parent Hierarchy:** `phoneCategoryMenu`
- **Commands Count:** 9

| Command ID | Gesture Code | Zone / Sub-Context | Action Type | Target Screen | Haptic Pattern | Spoken TTS Feedback |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `cmd_dlr1` | `SWIPE_LEFT` | `DEFAULT` | `TRIGGER_TTS` | `—` | `warning` | *"Deleted last dialed digit."* |
| `cmd_dlr2` | `SWIPE_UP` | `DEFAULT` | `NAVIGATE` | `dialerCallConfirmScreen` | `short` | *"Preparing to dial number. Double tap to call."* |
| `cmd_dlr3` | `DOUBLE_TAP` | `DEFAULT` | `NAVIGATE` | `dialerCallConfirmScreen` | `short` | *"Preparing to dial number. Double tap to call."* |
| `cmd_dlr4` | `LONG_PRESS` | `DEFAULT` | `NAVIGATE` | `phoneCategoryMenu` | `short` | *"Returned to Phone Menu."* |
| `cmd_dlr5` | `SWIPE_DOWN` | `DEFAULT` | `NAVIGATE` | `phoneCategoryMenu` | `short` | *"Returned to Phone Menu."* |
| `cmd_1786974894467` | `LONG_PRESS` | `zone_bottom_navigation_bar_global` | `CALL_CONTACT` | `zone_bottom_navigation_bar_global` | `success` | *"Return to Phone."* |
| `cmd_1786974876016` | `DOUBLE_TAP` | `zone_bottom_navigation_bar_global` | `CALL_CONTACT` | `zone_bottom_navigation_bar_global` | `success` | *"Calling dialed number."* |
| `cmd_1786973194161` | `SWIPE_UP` | `zone_bottom_navigation_bar_global` | `TRIGGER_TTS` | `zone_bottom_navigation_bar_global` | `success` | *"Preparing to call number."* |
| `cmd_1786973177133` | `SWIPE_LEFT` | `zone_bottom_navigation_bar_global` | `TRIGGER_TTS` | `zone_bottom_navigation_bar_global` | `success` | *"Deleted last digit."* |

---

## Screen: Landing & Mode Select (`landingScreen`)
- **Parent Hierarchy:** `Root`
- **Commands Count:** 3

| Command ID | Gesture Code | Zone / Sub-Context | Action Type | Target Screen | Haptic Pattern | Spoken TTS Feedback |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `cmd_land1` | `SWIPE_RIGHT` | `DEFAULT` | `NAVIGATE` | `welcomeScreen` | `success` | *"Entering Welcome screen."* |
| `cmd_land2` | `DOUBLE_TAP` | `DEFAULT` | `NAVIGATE` | `welcomeScreen` | `success` | *"Entering Welcome screen."* |
| `cmd_land3` | `SWIPE_LEFT` | `DEFAULT` | `NAVIGATE` | `onboardingAuthScreen` | `short` | *"Opening Biometric Device Login."* |

---

## Screen: Letter Calibration & Tutorial (`tutorialScreen`)
- **Parent Hierarchy:** `Root`
- **Commands Count:** 0

*No contextual commands configured yet for this screen.*

## Screen: Main Menu Categories (`mainMenuScreen`)
- **Parent Hierarchy:** `Root`
- **Commands Count:** 8

| Command ID | Gesture Code | Zone / Sub-Context | Action Type | Target Screen | Haptic Pattern | Spoken TTS Feedback |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `cmd_m1` | `SWIPE_RIGHT` | `DEFAULT` | `NAVIGATE_NEXT` | `—` | `short` | *"Phone and Contacts. Call favorites and dial numbers. Double tap to open."* |
| `cmd_m2` | `SWIPE_LEFT` | `DEFAULT` | `NAVIGATE_PREV` | `—` | `short` | *"Settings. Reading mode, haptics and privacy. Double tap to open."* |
| `cmd_m3` | `DOUBLE_TAP` | `DEFAULT` | `SELECT_ITEM` | `messagesView` | `success` | *"Opening Messages."* |
| `cmd_m4` | `LONG_PRESS` | `DEFAULT` | `TRIGGER_TTS` | `—` | `long` | *"Main Menu Help: Swipe right or left inside navigation bar to browse categories, double tap to open."* |
| `cmd_m5` | `TWO_FINGER_TAP` | `DEFAULT` | `TRIGGER_TTS` | `—` | `success` | *"Status check: Time is 12:00, Battery 85%, Connection is stable."* |
| `cmd_m6` | `SWIPE_DOWN` | `DEFAULT` | `TRIGGER_TTS` | `—` | `short` | *"Main Menu root active. 5 categories available."* |
| `cmd_1786966813813` | `SWIPE_LEFT` | `zone_bottom_navigation_bar_global` | `NAVIGATE_PREV` | `zone_bottom_navigation_bar_global` | `success` | *"Previous category."* |
| `cmd_1786966765942` | `SWIPE_RIGHT` | `zone_bottom_navigation_bar_global` | `NAVIGATE_NEXT` | `zone_bottom_navigation_bar_global` | `success` | *"Next category."* |

---

## Screen: Message Privacy Reader & Morse Reply (`msgPrivacyReaderReplyScreen`)
- **Parent Hierarchy:** `messagesView`
- **Commands Count:** 7

| Command ID | Gesture Code | Zone / Sub-Context | Action Type | Target Screen | Haptic Pattern | Spoken TTS Feedback |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `cmd_msgp1` | `SWIPE_RIGHT` | `DEFAULT` | `TRIGGER_TTS` | `—` | `short` | *"Space"* |
| `cmd_msgp2` | `SWIPE_LEFT` | `DEFAULT` | `TRIGGER_TTS` | `—` | `warning` | *"Delete"* |
| `cmd_msgp3` | `SWIPE_UP` | `DEFAULT` | `NAVIGATE` | `msgSendConfirmScreen` | `warning` | *"Preparing to send message. Double tap to confirm."* |
| `cmd_msgp4` | `LONG_PRESS` | `DEFAULT` | `NAVIGATE` | `messagesView` | `short` | *"Exited privacy screen. Returned to message list."* |
| `cmd_msgp5` | `SWIPE_DOWN` | `DEFAULT` | `NAVIGATE` | `messagesView` | `short` | *"Exited privacy screen. Returned to message list."* |
| `cmd_1786973827493` | `LONG_PRESS` | `zone_bottom_navigation_bar_global` | `NAVIGATE` | `zone_bottom_navigation_bar_global` | `success` | *"Return to Messages."* |

---

## Screen: Message Send Confirmation (`msgSendConfirmScreen`)
- **Parent Hierarchy:** `messagesView`
- **Commands Count:** 4

| Command ID | Gesture Code | Zone / Sub-Context | Action Type | Target Screen | Haptic Pattern | Spoken TTS Feedback |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `cmd_msgs1` | `DOUBLE_TAP` | `DEFAULT` | `SEND_MESSAGE` | `messagesView` | `success` | *"Reply message sent successfully."* |
| `cmd_msgs2` | `SWIPE_DOWN` | `DEFAULT` | `NAVIGATE` | `msgPrivacyReaderReplyScreen` | `short` | *"Send cancelled. Returned to privacy reader."* |
| `cmd_msgs3` | `LONG_PRESS` | `DEFAULT` | `NAVIGATE` | `msgPrivacyReaderReplyScreen` | `short` | *"Send cancelled. Returned to privacy reader."* |
| `cmd_1786972353038` | `DOUBLE_TAP` | `zone_bottom_navigation_bar_global` | `SEND_MESSAGE` | `zone_bottom_navigation_bar_global` | `success` | *"Message sent."* |

---

## Screen: Messages List & Detail (`messagesView`)
- **Parent Hierarchy:** `mainMenuScreen`
- **Commands Count:** 9

| Command ID | Gesture Code | Zone / Sub-Context | Action Type | Target Screen | Haptic Pattern | Spoken TTS Feedback |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `cmd_messagesView_1` | `SWIPE_RIGHT` | `DEFAULT` | `NAVIGATE_NEXT` | `—` | `short` | *"Next message from Doctor Office: Your prescription is ready for pickup."* |
| `cmd_messagesView_2` | `SWIPE_LEFT` | `DEFAULT` | `NAVIGATE_PREV` | `—` | `short` | *"Previous message from Mother: Where are you? When are you coming home?"* |
| `cmd_messagesView_3` | `DOUBLE_TAP` | `DEFAULT` | `READ_MESSAGE` | `msgPrivacyReaderReplyScreen` | `success` | *"Opening Private Message Reader."* |
| `cmd_messagesView_4` | `LONG_PRESS` | `DEFAULT` | `PLAY_MORSE` | `—` | `warning` | *"Playing Morse haptic vibration for message text."* |
| `cmd_messagesView_5` | `SWIPE_DOWN` | `DEFAULT` | `NAVIGATE` | `mainMenuScreen` | `short` | *"Returning to Main Menu."* |
| `cmd_messagesView_6` | `SWIPE_UP` | `DEFAULT` | `SEND_MESSAGE` | `msgSendConfirmScreen` | `warning` | *"Preparing voice reply."* |
| `cmd_1786973839423` | `LONG_PRESS` | `zone_bottom_navigation_bar_global` | `NAVIGATE` | `zone_bottom_navigation_bar_global` | `success` | *"Return to Main Menu."* |
| `cmd_1786967419708` | `SWIPE_LEFT` | `zone_bottom_navigation_bar_global` | `NAVIGATE_PREV` | `zone_bottom_navigation_bar_global` | `success` | *"Previous message"* |
| `cmd_1786967407601` | `SWIPE_RIGHT` | `zone_bottom_navigation_bar_global` | `NAVIGATE_NEXT` | `zone_bottom_navigation_bar_global` | `success` | *"Next message"* |

---

## Screen: Messages Screen (`messagesScreen`)
- **Parent Hierarchy:** `mainMenuScreen`
- **Commands Count:** 6

| Command ID | Gesture Code | Zone / Sub-Context | Action Type | Target Screen | Haptic Pattern | Spoken TTS Feedback |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `cmd_messagesScreen_1` | `SWIPE_RIGHT` | `DEFAULT` | `NAVIGATE_NEXT` | `—` | `short` | *"Next message from Doctor Office: Your prescription is ready for pickup."* |
| `cmd_messagesScreen_2` | `SWIPE_LEFT` | `DEFAULT` | `NAVIGATE_PREV` | `—` | `short` | *"Previous message from Mother: Where are you? When are you coming home?"* |
| `cmd_messagesScreen_3` | `DOUBLE_TAP` | `DEFAULT` | `READ_MESSAGE` | `msgPrivacyReaderReplyScreen` | `success` | *"Opening Private Message Reader."* |
| `cmd_messagesScreen_4` | `LONG_PRESS` | `DEFAULT` | `PLAY_MORSE` | `—` | `warning` | *"Playing Morse haptic vibration for message text."* |
| `cmd_messagesScreen_5` | `SWIPE_DOWN` | `DEFAULT` | `NAVIGATE` | `mainMenuScreen` | `short` | *"Returning to Main Menu."* |
| `cmd_messagesScreen_6` | `SWIPE_UP` | `DEFAULT` | `SEND_MESSAGE` | `msgSendConfirmScreen` | `warning` | *"Preparing voice reply."* |

---

## Screen: Navigation Categories Menu (`navCategoryMenu`)
- **Parent Hierarchy:** `mainMenuScreen`
- **Commands Count:** 8

| Command ID | Gesture Code | Zone / Sub-Context | Action Type | Target Screen | Haptic Pattern | Spoken TTS Feedback |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `cmd_navCategoryMenu_1` | `SWIPE_RIGHT` | `DEFAULT` | `NAVIGATE_NEXT` | `—` | `short` | *"Saved Places. Quick access saved destinations. Double tap to open."* |
| `cmd_navCategoryMenu_2` | `SWIPE_LEFT` | `DEFAULT` | `NAVIGATE_PREV` | `—` | `short` | *"Navigate to Place. Enter or speak a destination. Double tap to open."* |
| `cmd_navCategoryMenu_3` | `DOUBLE_TAP` | `DEFAULT` | `SELECT_ITEM` | `navSearchInputScreen` | `success` | *"Opening Place Finder."* |
| `cmd_navCategoryMenu_4` | `LONG_PRESS` | `DEFAULT` | `NAVIGATE` | `mainMenuScreen` | `short` | *"Returning to Main Menu."* |
| `cmd_navCategoryMenu_5` | `SWIPE_DOWN` | `DEFAULT` | `NAVIGATE` | `mainMenuScreen` | `short` | *"Returning to Main Menu."* |
| `cmd_1787058231600` | `DOUBLE_TAP` | `zone_bottom_navigation_bar_global` | `SELECT_ITEM` | `zone_bottom_navigation_bar_global` | `success` | *"Opening navigation category."* |
| `cmd_1787058202006` | `SWIPE_LEFT` | `zone_bottom_navigation_bar_global` | `NAVIGATE_PREV` | `zone_bottom_navigation_bar_global` | `success` | *"Previous navigation category."* |
| `cmd_1787058184662` | `SWIPE_RIGHT` | `zone_bottom_navigation_bar_global` | `NAVIGATE_NEXT` | `zone_bottom_navigation_bar_global` | `success` | *"Next navigation category."* |

---

## Screen: Navigation Screen (`navigationScreen`)
- **Parent Hierarchy:** `mainMenuScreen`
- **Commands Count:** 5

| Command ID | Gesture Code | Zone / Sub-Context | Action Type | Target Screen | Haptic Pattern | Spoken TTS Feedback |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `cmd_navigationScreen_1` | `SWIPE_RIGHT` | `DEFAULT` | `NAVIGATE_NEXT` | `—` | `short` | *"Saved Places. Quick access saved destinations. Double tap to open."* |
| `cmd_navigationScreen_2` | `SWIPE_LEFT` | `DEFAULT` | `NAVIGATE_PREV` | `—` | `short` | *"Navigate to Place. Enter or speak a destination. Double tap to open."* |
| `cmd_navigationScreen_3` | `DOUBLE_TAP` | `DEFAULT` | `SELECT_ITEM` | `navSearchInputScreen` | `success` | *"Opening Place Finder."* |
| `cmd_navigationScreen_4` | `LONG_PRESS` | `DEFAULT` | `NAVIGATE` | `mainMenuScreen` | `short` | *"Returning to Main Menu."* |
| `cmd_navigationScreen_5` | `SWIPE_DOWN` | `DEFAULT` | `NAVIGATE` | `mainMenuScreen` | `short` | *"Returning to Main Menu."* |

---

## Screen: Navigation View (`navigationView`)
- **Parent Hierarchy:** `mainMenuScreen`
- **Commands Count:** 6

| Command ID | Gesture Code | Zone / Sub-Context | Action Type | Target Screen | Haptic Pattern | Spoken TTS Feedback |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `cmd_navigationView_1` | `SWIPE_RIGHT` | `DEFAULT` | `NAVIGATE_NEXT` | `—` | `short` | *"Saved Places. Quick access saved destinations. Double tap to open."* |
| `cmd_navigationView_2` | `SWIPE_LEFT` | `DEFAULT` | `NAVIGATE_PREV` | `—` | `short` | *"Navigate to Place. Enter or speak a destination. Double tap to open."* |
| `cmd_navigationView_3` | `DOUBLE_TAP` | `DEFAULT` | `SELECT_ITEM` | `navSearchInputScreen` | `success` | *"Opening Place Finder."* |
| `cmd_navigationView_4` | `LONG_PRESS` | `DEFAULT` | `NAVIGATE` | `mainMenuScreen` | `short` | *"Returning to Main Menu."* |
| `cmd_navigationView_5` | `SWIPE_DOWN` | `DEFAULT` | `NAVIGATE` | `mainMenuScreen` | `short` | *"Returning to Main Menu."* |
| `cmd_1787058150055` | `DOUBLE_TAP` | `zone_bottom_navigation_bar_global` | `SELECT_ITEM` | `zone_bottom_navigation_bar_global` | `success` | *"Opening navigation categories."* |

---

## Screen: Phone & Contacts View (`phoneView`)
- **Parent Hierarchy:** `mainMenuScreen`
- **Commands Count:** 7

| Command ID | Gesture Code | Zone / Sub-Context | Action Type | Target Screen | Haptic Pattern | Spoken TTS Feedback |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `cmd_phoneView_1` | `SWIPE_RIGHT` | `DEFAULT` | `NAVIGATE_NEXT` | `—` | `short` | *"Favorites. Quick access favorite contacts. Double tap to open."* |
| `cmd_phoneView_2` | `SWIPE_LEFT` | `DEFAULT` | `NAVIGATE_PREV` | `—` | `short` | *"Handwriting Dialer. Draw numbers on screen to call. Double tap to open."* |
| `cmd_phoneView_3` | `DOUBLE_TAP` | `DEFAULT` | `SELECT_ITEM` | `contactsListScreen` | `success` | *"Opening Contacts Directory."* |
| `cmd_phoneView_4` | `LONG_PRESS` | `DEFAULT` | `NAVIGATE` | `mainMenuScreen` | `short` | *"Returning to Main Menu."* |
| `cmd_phoneView_5` | `SWIPE_DOWN` | `DEFAULT` | `NAVIGATE` | `mainMenuScreen` | `short` | *"Returning to Main Menu."* |
| `cmd_1786974186116` | `DOUBLE_TAP` | `zone_bottom_navigation_bar_global` | `SELECT_ITEM` | `zone_bottom_navigation_bar_global` | `success` | *"Opening phone categories."* |
| `cmd_1786970344236` | `LONG_PRESS` | `zone_bottom_navigation_bar_global` | `NAVIGATE` | `zone_bottom_navigation_bar_global` | `success` | *"Return to Main Menu."* |

---

## Screen: Phone Calls Screen (`callsScreen`)
- **Parent Hierarchy:** `mainMenuScreen`
- **Commands Count:** 5

| Command ID | Gesture Code | Zone / Sub-Context | Action Type | Target Screen | Haptic Pattern | Spoken TTS Feedback |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `cmd_callsScreen_1` | `SWIPE_RIGHT` | `DEFAULT` | `NAVIGATE_NEXT` | `—` | `short` | *"Favorites. Quick access favorite contacts. Double tap to open."* |
| `cmd_callsScreen_2` | `SWIPE_LEFT` | `DEFAULT` | `NAVIGATE_PREV` | `—` | `short` | *"Handwriting Dialer. Draw numbers on screen to call. Double tap to open."* |
| `cmd_callsScreen_3` | `DOUBLE_TAP` | `DEFAULT` | `SELECT_ITEM` | `contactsListScreen` | `success` | *"Opening Contacts Directory."* |
| `cmd_callsScreen_4` | `LONG_PRESS` | `DEFAULT` | `NAVIGATE` | `mainMenuScreen` | `short` | *"Returning to Main Menu."* |
| `cmd_callsScreen_5` | `SWIPE_DOWN` | `DEFAULT` | `NAVIGATE` | `mainMenuScreen` | `short` | *"Returning to Main Menu."* |

---

## Screen: Phone Categories Menu (`phoneCategoryMenu`)
- **Parent Hierarchy:** `mainMenuScreen`
- **Commands Count:** 9

| Command ID | Gesture Code | Zone / Sub-Context | Action Type | Target Screen | Haptic Pattern | Spoken TTS Feedback |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `cmd_phoneCategoryMenu_2` | `SWIPE_LEFT` | `DEFAULT` | `NAVIGATE_PREV` | `—` | `short` | *"Handwriting Dialer. Draw numbers on screen to call. Double tap to open."* |
| `cmd_phoneCategoryMenu_3` | `DOUBLE_TAP` | `DEFAULT` | `SELECT_ITEM` | `contactsListScreen` | `success` | *"Opening Contacts Directory."* |
| `cmd_phoneCategoryMenu_4` | `LONG_PRESS` | `DEFAULT` | `NAVIGATE` | `mainMenuScreen` | `short` | *"Returning to Main Menu."* |
| `cmd_phoneCategoryMenu_5` | `SWIPE_DOWN` | `DEFAULT` | `NAVIGATE` | `mainMenuScreen` | `short` | *"Returning to Main Menu."* |
| `cmd_phoneCategoryMenu_1` | `SWIPE_RIGHT` | `DEFAULT` | `NAVIGATE_NEXT` | `—` | `short` | *"Favorites. Quick access favorite contacts. Double tap to open."* |
| `cmd_1787057528996` | `LONG_PRESS` | `zone_bottom_navigation_bar_global` | `NAVIGATE` | `zone_bottom_navigation_bar_global` | `success` | *"Return to Phone."* |
| `cmd_1786972574290` | `DOUBLE_TAP` | `zone_bottom_navigation_bar_global` | `SELECT_ITEM` | `zone_bottom_navigation_bar_global` | `success` | *"Opening category."* |
| `cmd_1786972548629` | `SWIPE_LEFT` | `zone_bottom_navigation_bar_global` | `NAVIGATE_PREV` | `zone_bottom_navigation_bar_global` | `success` | *"Previous phone category."* |
| `cmd_1786972527890` | `SWIPE_RIGHT` | `zone_bottom_navigation_bar_global` | `NAVIGATE_NEXT` | `zone_bottom_navigation_bar_global` | `success` | *"Next phone category."* |

---

## Screen: Place Actions Menu (`navPlaceActionMenuScreen`)
- **Parent Hierarchy:** `navCategoryMenu`
- **Commands Count:** 5

| Command ID | Gesture Code | Zone / Sub-Context | Action Type | Target Screen | Haptic Pattern | Spoken TTS Feedback |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `cmd_navp1` | `SWIPE_RIGHT` | `DEFAULT` | `NAVIGATE_NEXT` | `—` | `short` | *"Call Place. Double tap to execute."* |
| `cmd_navp2` | `SWIPE_LEFT` | `DEFAULT` | `NAVIGATE_PREV` | `—` | `short` | *"Navigate to Place. Double tap to execute."* |
| `cmd_navp3` | `DOUBLE_TAP` | `DEFAULT` | `START_GPS_GUIDE` | `navActiveRouteScreen` | `success` | *"GPS navigation started. In 25 meters, turn right."* |
| `cmd_navp4` | `LONG_PRESS` | `DEFAULT` | `NAVIGATE` | `savedPlacesListScreen` | `short` | *"Cancelled. Returned to saved places."* |
| `cmd_navp5` | `SWIPE_DOWN` | `DEFAULT` | `NAVIGATE` | `savedPlacesListScreen` | `short` | *"Cancelled. Returned to saved places."* |

---

## Screen: Place Search Input (`navSearchInputScreen`)
- **Parent Hierarchy:** `navCategoryMenu`
- **Commands Count:** 2

| Command ID | Gesture Code | Zone / Sub-Context | Action Type | Target Screen | Haptic Pattern | Spoken TTS Feedback |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `cmd_1787058390830` | `LONG_PRESS` | `zone_bottom_navigation_bar_global` | `NAVIGATE` | `zone_bottom_navigation_bar_global` | `success` | *"Return to Navigation."* |
| `cmd_1787058363265` | `DOUBLE_TAP` | `zone_bottom_navigation_bar_global` | `SELECT_ITEM` | `zone_bottom_navigation_bar_global` | `success` | *"Searching entered place."* |

---

## Screen: Quick Actions Manager (`settingsQuickAccessScreen`)
- **Parent Hierarchy:** `settingsCategoryMenu`
- **Commands Count:** 6

| Command ID | Gesture Code | Zone / Sub-Context | Action Type | Target Screen | Haptic Pattern | Spoken TTS Feedback |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `cmd_setq1` | `SWIPE_RIGHT` | `DEFAULT` | `NAVIGATE_NEXT` | `—` | `short` | *"Quick Action: Route to Home. Status: Enabled. Double tap to toggle."* |
| `cmd_setq2` | `SWIPE_LEFT` | `DEFAULT` | `NAVIGATE_PREV` | `—` | `short` | *"Quick Action: Speed Dial Mother. Status: Enabled. Double tap to toggle."* |
| `cmd_setq3` | `DOUBLE_TAP` | `DEFAULT` | `TOGGLE_SETTING` | `—` | `success` | *"Quick action status toggled."* |
| `cmd_setq4` | `SWIPE_UP` | `DEFAULT` | `NAVIGATE` | `settingsAddQuickActionScreen` | `warning` | *"Add new quick action. Choose action type."* |
| `cmd_setq5` | `LONG_PRESS` | `DEFAULT` | `NAVIGATE` | `settingsCategoryMenu` | `short` | *"Returned to Settings Menu."* |
| `cmd_setq6` | `SWIPE_DOWN` | `DEFAULT` | `NAVIGATE` | `settingsCategoryMenu` | `short` | *"Returned to Settings Menu."* |

---

## Screen: Saved Destinations (`savedPlacesListScreen`)
- **Parent Hierarchy:** `navCategoryMenu`
- **Commands Count:** 8

| Command ID | Gesture Code | Zone / Sub-Context | Action Type | Target Screen | Haptic Pattern | Spoken TTS Feedback |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `cmd_navs1` | `SWIPE_RIGHT` | `DEFAULT` | `NAVIGATE_NEXT` | `—` | `short` | *"Doctor Office: Mother Teresa Clinic Center. 1.2 km away. Double tap for actions."* |
| `cmd_navs2` | `SWIPE_LEFT` | `DEFAULT` | `NAVIGATE_PREV` | `—` | `short` | *"Home: Partizanska 45. 450m away. Double tap for actions."* |
| `cmd_navs3` | `DOUBLE_TAP` | `DEFAULT` | `SELECT_ITEM` | `navPlaceActionMenuScreen` | `success` | *"Opening place actions menu."* |
| `cmd_navs4` | `LONG_PRESS` | `DEFAULT` | `NAVIGATE` | `navCategoryMenu` | `short` | *"Returned to Navigation Menu."* |
| `cmd_navs5` | `SWIPE_DOWN` | `DEFAULT` | `NAVIGATE` | `navCategoryMenu` | `short` | *"Returned to Navigation Menu."* |
| `cmd_1787058450550` | `SWIPE_LEFT` | `zone_bottom_navigation_bar_global` | `NAVIGATE_PREV` | `zone_bottom_navigation_bar_global` | `success` | *"Previous saved place."* |
| `cmd_1787058437054` | `SWIPE_RIGHT` | `zone_bottom_navigation_bar_global` | `NAVIGATE_NEXT` | `zone_bottom_navigation_bar_global` | `success` | *"Next saved place."* |
| `cmd_1787058415683` | `LONG_PRESS` | `zone_bottom_navigation_bar_global` | `NAVIGATE` | `zone_bottom_navigation_bar_global` | `success` | *"Return to Navigation."* |

---

## Screen: Settings Categories Menu (`settingsCategoryMenu`)
- **Parent Hierarchy:** `mainMenuScreen`
- **Commands Count:** 9

| Command ID | Gesture Code | Zone / Sub-Context | Action Type | Target Screen | Haptic Pattern | Spoken TTS Feedback |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `cmd_settingsCategoryMenu_1` | `SWIPE_RIGHT` | `DEFAULT` | `NAVIGATE_NEXT` | `—` | `short` | *"Quick Access. Manage and create quick actions. Double tap to open."* |
| `cmd_settingsCategoryMenu_2` | `SWIPE_LEFT` | `DEFAULT` | `NAVIGATE_PREV` | `—` | `short` | *"Tutorial Mode. Restart guided voice tutorial. Double tap to open."* |
| `cmd_settingsCategoryMenu_3` | `DOUBLE_TAP` | `DEFAULT` | `SELECT_ITEM` | `settingsAccessibilityMenu` | `success` | *"Opening Accessibility Preferences."* |
| `cmd_settingsCategoryMenu_4` | `LONG_PRESS` | `DEFAULT` | `NAVIGATE` | `mainMenuScreen` | `short` | *"Returning to Main Menu."* |
| `cmd_settingsCategoryMenu_5` | `SWIPE_DOWN` | `DEFAULT` | `NAVIGATE` | `mainMenuScreen` | `short` | *"Returning to Main Menu."* |
| `cmd_1787058693459` | `LONG_PRESS` | `zone_bottom_navigation_bar_global` | `NAVIGATE` | `zone_bottom_navigation_bar_global` | `success` | *"Return to Settings."* |
| `cmd_1787058669100` | `DOUBLE_TAP` | `zone_bottom_navigation_bar_global` | `SELECT_ITEM` | `zone_bottom_navigation_bar_global` | `success` | *"Opening settings category."* |
| `cmd_1787058648105` | `SWIPE_LEFT` | `zone_bottom_navigation_bar_global` | `NAVIGATE_PREV` | `zone_bottom_navigation_bar_global` | `success` | *"Previous settings category."* |
| `cmd_1787058633234` | `SWIPE_RIGHT` | `zone_bottom_navigation_bar_global` | `NAVIGATE_NEXT` | `zone_bottom_navigation_bar_global` | `success` | *"Next settings category."* |

---

## Screen: Settings Screen (`settingsScreen`)
- **Parent Hierarchy:** `mainMenuScreen`
- **Commands Count:** 5

| Command ID | Gesture Code | Zone / Sub-Context | Action Type | Target Screen | Haptic Pattern | Spoken TTS Feedback |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `cmd_settingsScreen_1` | `SWIPE_RIGHT` | `DEFAULT` | `NAVIGATE_NEXT` | `—` | `short` | *"Quick Access. Manage and create quick actions. Double tap to open."* |
| `cmd_settingsScreen_2` | `SWIPE_LEFT` | `DEFAULT` | `NAVIGATE_PREV` | `—` | `short` | *"Tutorial Mode. Restart guided voice tutorial. Double tap to open."* |
| `cmd_settingsScreen_3` | `DOUBLE_TAP` | `DEFAULT` | `SELECT_ITEM` | `settingsAccessibilityMenu` | `success` | *"Opening Accessibility Preferences."* |
| `cmd_settingsScreen_4` | `LONG_PRESS` | `DEFAULT` | `NAVIGATE` | `mainMenuScreen` | `short` | *"Returning to Main Menu."* |
| `cmd_settingsScreen_5` | `SWIPE_DOWN` | `DEFAULT` | `NAVIGATE` | `mainMenuScreen` | `short` | *"Returning to Main Menu."* |

---

## Screen: Settings View (`settingsView`)
- **Parent Hierarchy:** `mainMenuScreen`
- **Commands Count:** 6

| Command ID | Gesture Code | Zone / Sub-Context | Action Type | Target Screen | Haptic Pattern | Spoken TTS Feedback |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `cmd_settingsView_1` | `SWIPE_RIGHT` | `DEFAULT` | `NAVIGATE_NEXT` | `—` | `short` | *"Quick Access. Manage and create quick actions. Double tap to open."* |
| `cmd_settingsView_2` | `SWIPE_LEFT` | `DEFAULT` | `NAVIGATE_PREV` | `—` | `short` | *"Tutorial Mode. Restart guided voice tutorial. Double tap to open."* |
| `cmd_settingsView_3` | `DOUBLE_TAP` | `DEFAULT` | `SELECT_ITEM` | `settingsAccessibilityMenu` | `success` | *"Opening Accessibility Preferences."* |
| `cmd_settingsView_4` | `LONG_PRESS` | `DEFAULT` | `NAVIGATE` | `mainMenuScreen` | `short` | *"Returning to Main Menu."* |
| `cmd_settingsView_5` | `SWIPE_DOWN` | `DEFAULT` | `NAVIGATE` | `mainMenuScreen` | `short` | *"Returning to Main Menu."* |
| `cmd_1787058586328` | `DOUBLE_TAP` | `zone_bottom_navigation_bar_global` | `SELECT_ITEM` | `zone_bottom_navigation_bar_global` | `success` | *"Opening settings menu."* |

---

## Screen: Tutorial Mode Menu (`settingsTutorialMenu`)
- **Parent Hierarchy:** `settingsCategoryMenu`
- **Commands Count:** 3

| Command ID | Gesture Code | Zone / Sub-Context | Action Type | Target Screen | Haptic Pattern | Spoken TTS Feedback |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `cmd_sett1` | `DOUBLE_TAP` | `DEFAULT` | `RESTART_TUTORIAL` | `tutorialScreen` | `success` | *"Restarting tutorial. Letter calibration started."* |
| `cmd_sett2` | `LONG_PRESS` | `DEFAULT` | `NAVIGATE` | `settingsCategoryMenu` | `short` | *"Returned to Settings Menu."* |
| `cmd_sett3` | `SWIPE_DOWN` | `DEFAULT` | `NAVIGATE` | `settingsCategoryMenu` | `short` | *"Returned to Settings Menu."* |

---

## Screen: Welcome & Orientation (`welcomeScreen`)
- **Parent Hierarchy:** `Root`
- **Commands Count:** 4

| Command ID | Gesture Code | Zone / Sub-Context | Action Type | Target Screen | Haptic Pattern | Spoken TTS Feedback |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `cmd_w1` | `SWIPE_RIGHT` | `DEFAULT` | `NAVIGATE` | `mainMenuScreen` | `success` | *"Entering Main Menu. Messages focused."* |
| `cmd_w2` | `DOUBLE_TAP` | `DEFAULT` | `NAVIGATE` | `mainMenuScreen` | `success` | *"Entering Main Menu. Messages focused."* |
| `cmd_w3` | `SWIPE_LEFT` | `DEFAULT` | `NAVIGATE` | `onboardingAuthScreen` | `short` | *"Starting device authentication and setup."* |
| `cmd_w4` | `LONG_PRESS` | `DEFAULT` | `TRIGGER_TTS` | `—` | `long` | *"Welcome to BlindEye. Double tap or swipe right to enter main menu."* |

---

