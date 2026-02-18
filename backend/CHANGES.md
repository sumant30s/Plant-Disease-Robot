# Plant Disease Detection System - Changes Summary

## Overview
The system has been modified to detect plant diseases and control a relay with automatic reset functionality.

## Key Changes

### 1. **Model Changed**
- **Before**: YOLOv8n base model (80 COCO classes for general object detection)
- **After**: Custom plant disease detection model (`best.pt`)

### 2. **Relay Control Logic**
- **Before**: Relay=1 when objects detected, Relay=0 when no objects
- **After**: When disease is detected:
  - Relay immediately set to **1**
  - After **10 seconds**, Relay automatically resets to **0**
  - 2-second cooldown between detections to prevent rapid re-triggering

### 3. **Detection Behavior**
```
┌─────────────────┐
│ Monitoring      │ ← Relay = 0
└────────┬────────┘
         │
         │ Disease Detected!
         ▼
┌─────────────────┐
│ Relay = 1       │ ← Disease found
│ (Active)        │
└────────┬────────┘
         │
         │ 10 seconds timer
         ▼
┌─────────────────┐
│ Relay = 0       │ ← Auto-reset
│ (Ready)         │
└─────────────────┘
```

### 4. **New Features**
- **Auto-reset Timer**: Relay automatically returns to 0 after 10 seconds
- **Disease Detection Flag**: Tracks if a disease is currently being processed
- **Cooldown Period**: 2-second cooldown to avoid rapid re-triggering
- **Visual Feedback**: Video feed shows timer status and relay state

### 5. **Technical Implementation**
- Uses `threading.Timer` for the 10-second auto-reset
- Global flag `disease_detected_flag` to track active detections
- Timer cancellation on shutdown or new detection
- Updated Firebase path: `/UV_Sanitization/Relay` (0 or 1)

## Usage

### Running the System
```bash
cd backend
python app.py
```

### Testing
1. **Manual Test**: Visit `http://localhost:5001` and click "Set Relay = 1"
   - Relay will activate and auto-reset after 10 seconds
2. **Live Detection**: Point camera at diseased plant
   - System detects disease → Relay = 1
   - After 10 seconds → Relay = 0 automatically

### Firebase Structure
```json
{
  "UV_Sanitization": {
    "Relay": 0  // or 1 when disease detected
  }
}
```

## Configuration
- **Detection Cooldown**: 2.0 seconds (prevents rapid re-triggering)
- **Auto-reset Time**: 10 seconds (fixed)
- **Confidence Threshold**: 0.5 (50% confidence required)
- **Camera Index**: 0 (change if using different webcam)

## Requirements
- Python 3.x
- OpenCV (`cv2`)
- Ultralytics YOLO
- Flask & Flask-CORS
- Custom model file: `best.pt` (must be in backend directory)
- Internet connection (for Firebase REST API)

## Firebase Setup
Database rules must allow public access:
```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

## Endpoints
- `/` - Main interface with video feed
- `/video_feed` - Live camera stream
- `/test_detection` - Manual trigger (sets Relay=1 with 10s auto-reset)
- `/manual_clear` - Manual clear (sets Relay=0)
- `/status` - System status
- `/firebase_structure` - Documentation

## Notes
- Each new disease detection resets the 10-second timer
- Relay state persists in Firebase (readable by other devices)
- System uses REST API (no Firebase credentials needed)
- All timers are cancelled on shutdown
