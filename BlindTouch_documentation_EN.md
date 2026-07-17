## 1. Introduction
# 1.1 Application Description

The application represents a mobile accessibility platform designed for blind and visually impaired users, with the goal of enabling easier and more independent use of the basic functionalities of a smartphone.

Unlike traditional mobile applications that are based on visual interaction, this application uses a haptic-first approach, where the primary methods of communication with the user are implemented through:

gestures
vibration feedback
audio feedback
Morse Haptic communication

The application combines the most commonly used smartphone functionalities into one simplified environment:

messages
phone calls
contacts
AI-powered camera recognition
navigation
SOS system
personalized quick actions

The main goal is to reduce dependency on visual interfaces and enable smartphone usage through a consistent interaction system.

1.2 Main Idea

The main idea of the application is to create a unified interface where the user does not need to adapt to different screens and layouts.

Instead of a traditional interface with many visual elements, the application uses:

Gesture Navigation

The user controls the application through predefined gestures:

swipe
tap
double tap
long press
shake
Haptic Feedback

Each function has its own vibration pattern that allows the user to recognize the current state without needing to look at the screen.

Alternative Communication

The application supports:

Text-To-Speech for users who use voice communication
Morse Haptic for deaf-blind users
Speech-To-Text for text input
2. Main Navigation
2.1 Main Menu

When starting the application, the user accesses the main menu.

The main menu contains five basic modules:

No.	Module	Description
1	Messages	Reading and sending messages
2	Calls	Contacts, calls and number dialing
3	Camera	OCR and object recognition
4	Navigation	GPS navigation and locations
5	Settings	Accessibility and personalization

The SOS system is not a direct item in the main menu because its purpose is fast activation during emergency situations.

It is activated through a separate physical gesture.

2.2 Fixed Swipe Navigation Area

The application uses a fixed interactive zone positioned at the bottom of the screen.

This zone is available in all modules and represents the only method for navigating through the application.

Advantages:

the user always knows where the navigation area is located
there is no need to visually search for buttons
the same principle is used throughout the entire application

Example:

Messages

Swipe right:
→ next message

Swipe left:
→ previous message

Calls

Swipe right:
→ next contact

Swipe left:
→ previous contact

Settings

Swipe right:
→ next setting

Swipe left:
→ previous setting

2.3 Gesture System

The application uses a unified gesture system.

Gesture	Function
Swipe right	Next item
Swipe left	Previous item
Swipe up	Return to main menu
Swipe down	Open Quick Access
Tap	Select item
Double tap	Confirm action
Long press	Back / cancel / delete
Double Shake	Activate SOS
2.4 Haptic Feedback System

A unique vibration pattern is defined for each function.

Example:

Function	Vibration Pattern
Messages	•
Calls	••
Camera	•━━
Navigation	━━•
Settings	━━━

Short vibration:

.

represents a short signal.

Long vibration:

-

represents a longer signal.

This system creates a separate tactile language that allows recognition of functions without visual interaction.

2.5 Interaction Feedback

During every interaction, the user receives feedback through:

Successful Action

Example:

Menu selection

••

Meaning:

"Action successfully completed"

Error
•••

Meaning:

"Action cannot be completed"

2.6 Card Navigation

All elements inside the application are represented as cards.

Example:

Contacts:

┌─────────────┐
│ Mother      │
└─────────────┘
┌─────────────┐
│ Brother     │
└─────────────┘
┌─────────────┐
│ Doctor      │
└─────────────┘

The user navigates through cards:

Swipe right:
→ next card

Swipe left:
→ previous card

Tap:
→ selection

Double tap:
→ confirmation

3. Technical Implementation of Main Navigation

The main navigation is implemented using the Flutter framework.

Gesture Recognition

For recognizing user interactions, the application uses:

Flutter GestureDetector

Supported gestures:

onTap
onDoubleTap
onLongPress
onHorizontalDrag
onVerticalDrag
Haptic Feedback

For vibration feedback, the following are used:

HapticFeedback API
vibration package

Provides:

short vibrations
long vibrations
custom vibration patterns
Motion Sensors

For SOS activation through Double Shake, the application uses:

sensors_plus

which provides access to:

Accelerometer
Gyroscope

Accelerometer data is analyzed to detect sudden device movement.

4. Navigation System Architecture
                 Flutter UI

                     |

        Gesture Recognition Layer

                     |

        Accessibility Controller

                     |

        Haptic Feedback Manager

                     |

 --------------------------------

 Messages     Calls     Camera

 Navigation   Settings  SOS

 --------------------------------

                     |

          Native Device APIs
Android                         iOS

Sensors API                 Core Motion

Contacts API                Contacts Framework

SMS Provider                Local Authentication

Camera API                  Vision Framework