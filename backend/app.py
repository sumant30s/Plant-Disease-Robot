import cv2
import numpy as np
from flask import Flask, Response
from flask_cors import CORS
import threading
import time
from ultralytics import YOLO
import requests
import json

# Flask App
app = Flask(__name__)
CORS(app, resources={
    r"/*": {
        "origins": ["http://localhost:5173", "http://127.0.0.1:5174", "http://localhost:3000", "http://127.0.0.1:3000"],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type"]
    }
})

# Global variables
output_frame = None
frame_lock = threading.Lock()
last_detection_time = 0
detection_cooldown = 2.0  # Cooldown to avoid rapid re-triggering
last_relay_state = None  # Track last state to avoid redundant writes
relay_reset_timer = None  # Timer for automatic relay reset
disease_detected_flag = False  # Flag to track if disease is currently detected
detected_disease_name = None  # Store the name of the detected disease

# Firebase REST API Configuration
FIREBASE_DATABASE_URL = 'https://v2v-communication-d46c6-default-rtdb.firebaseio.com'
FIREBASE_PATH = '/3_Pesticide_Spray/Spray'
FIREBASE_FULL_URL = f"{FIREBASE_DATABASE_URL}{FIREBASE_PATH}.json"

# YOLOv8 model
model = None

def init_firebase():
    """Initialize Firebase connection using REST API (no credentials needed)"""
    try:
        print("🔥 Connecting to Firebase using REST API...")
        print(f"   Database URL: {FIREBASE_DATABASE_URL}")
        print(f"   Path: {FIREBASE_PATH}")
        
        # Test connection by reading current data
        response = requests.get(FIREBASE_FULL_URL, timeout=5)
        
        if response.status_code == 200:
            print("✅ Firebase connection established successfully!")
            current_data = response.json()
            if current_data:
                print(f"   Current data: {current_data}")
            else:
                print("   Database path is empty (will be created on first write)")
            return True
        else:
            print(f"⚠️  Firebase connection issue: HTTP {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except requests.exceptions.Timeout:
        print("❌ Firebase connection timeout")
        print("   Check your internet connection")
        return False
    except Exception as e:
        print(f"❌ Failed to connect to Firebase: {e}")
        print("\n📋 Troubleshooting steps:")
        print("1. Ensure your Firebase Database Rules allow public access:")
        print('   {"rules": {".read": true, ".write": true}}')
        print("2. Verify the database URL is correct")
        print("3. Check your internet connection")
        return False

def write_to_firebase(data):
    """Write data to Firebase using REST API"""
    try:
        response = requests.put(
            FIREBASE_FULL_URL,
            data=json.dumps(data),
            headers={'Content-Type': 'application/json'},
            timeout=5
        )
        
        if response.status_code == 200:
            return True
        else:
            print(f"⚠️  Firebase write failed: HTTP {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Firebase write error: {e}")
        return False

def read_from_firebase():
    """Read data from Firebase using REST API"""
    try:
        response = requests.get(FIREBASE_FULL_URL, timeout=5)
        
        if response.status_code == 200:
            return response.json()
        else:
            print(f"⚠️  Firebase read failed: HTTP {response.status_code}")
            return None
            
    except Exception as e:
        print(f"❌ Firebase read error: {e}")
        return None

def set_relay_state(value):
    """Set Relay to specified value (0, 1, 2, or 3)"""
    global last_relay_state
    
    try:
        # Only write if state has changed to avoid redundant writes
        if last_relay_state == value:
            return True
            
        if write_to_firebase(value):
            last_relay_state = value
            print(f"✅ Relay set to: {value}")
            return True
        else:
            print(f"❌ Failed to set Relay to {value}")
            return False
            
    except Exception as e:
        print(f"❌ Error setting Relay state: {e}")
        return False

def clear_detection():
    """Clear detection - set Relay to 0"""
    return set_relay_state(0)

def send_detection(disease_name=None):
    """Send detection signal - set Relay based on disease type and schedule auto-reset after 10 seconds
    Powdery = 1, Rust = 2, Virus = 3
    """
    global last_detection_time, relay_reset_timer, disease_detected_flag, detected_disease_name
    
    current_time = time.time()
    if current_time - last_detection_time < detection_cooldown:
        return False  # Skip to avoid spam
    
    last_detection_time = current_time
    disease_detected_flag = True
    detected_disease_name = disease_name
    
    # Determine relay value based on disease type
    relay_value = 0
    disease_lower = disease_name.lower() if disease_name else ""
    
    if "powdery" in disease_lower:
        relay_value = 1
    elif "rust" in disease_lower:
        relay_value = 2
    elif "virus" in disease_lower:
        relay_value = 3
    else:
        relay_value = 1  # Default to 1 for other diseases
    
    # Set relay to appropriate value immediately
    if set_relay_state(relay_value):
        disease_display = disease_name if disease_name else "UNKNOWN"
        print(f"🚨 DISEASE DETECTED: {disease_display} - Relay set to {relay_value}")
        
        # Cancel any existing timer
        if relay_reset_timer is not None:
            relay_reset_timer.cancel()
        
        # Schedule automatic reset to 0 after 10 seconds
        relay_reset_timer = threading.Timer(10.0, auto_reset_relay)
        relay_reset_timer.start()
        print("⏱️  Auto-reset scheduled in 10 seconds...")
        return True
    return False

def auto_reset_relay():
    """Automatically reset Relay to 0 after 10 seconds"""
    global disease_detected_flag, detected_disease_name
    disease_detected_flag = False
    detected_disease_name = None
    set_relay_state(0)
    print("✅ Auto-reset: Relay set back to 0 after 10 seconds")

def init_yolo_model():
    """Initialize custom plant disease detection model"""
    global model
    try:
        # Load the custom plant disease model
        model = YOLO('best.pt')  # Using custom trained model for plant diseases
        print("✅ Plant Disease Detection model loaded successfully")
        print(f"Model can detect {len(model.names)} disease classes: {list(model.names.values())}")
        return True
    except Exception as e:
        print(f"❌ Failed to load plant disease model: {e}")
        print("Make sure 'best.pt' exists in the backend directory")
        model = None
        return False

def format_disease_name(disease_name):
    """Format disease name for better display (e.g., rust, powdery, virus)"""
    if not disease_name:
        return "UNKNOWN"
    
    # Convert to title case and clean up
    formatted = disease_name.strip()
    
    # Handle common disease names
    formatted = formatted.replace("_", " ")
    formatted = formatted.replace("-", " ")
    
    # Capitalize each word
    formatted = " ".join(word.capitalize() for word in formatted.split())
    
    return formatted

def detect_objects(frame):
    """Detect plant diseases using custom trained model"""
    global model, disease_detected_flag, detected_disease_name
    
    if model is None:
        cv2.putText(frame, "MODEL NOT LOADED", (10, 30),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
        return False, frame
    
    try:
        # Run YOLO inference for plant disease detection
        results = model(frame, conf=0.7)  # Confidence threshold of 0.5
        
        disease_detected = False
        detection_count = 0
        healthy_count = 0
        detected_diseases = []
        highest_confidence_disease = None
        highest_confidence = 0.0
        
        # Process results
        for result in results:
            boxes = result.boxes
            if boxes is not None:
                for box in boxes:
                    # Get bounding box coordinates
                    x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                    confidence = box.conf[0].cpu().numpy()
                    class_id = int(box.cls[0].cpu().numpy())
                    
                    # Get disease class name from model
                    disease_name = model.names[class_id]
                    
                    # Check if this is a healthy detection (skip relay trigger for healthy plants)
                    is_healthy = "healthy" in disease_name.lower()
                    
                    # Format disease name for display
                    formatted_disease_name = format_disease_name(disease_name)
                    
                    if is_healthy:
                        # Count healthy detections separately
                        healthy_count += 1
                        
                        # Draw green bounding box for healthy plants
                        cv2.rectangle(frame, (int(x1), int(y1)), (int(x2), int(y2)), (0, 255, 0), 3)
                        
                        # Draw label with green background
                        label = f"{formatted_disease_name}: {confidence:.2f}"
                        (text_width, text_height), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.7, 2)
                        cv2.rectangle(frame, (int(x1), int(y1) - text_height - 10), 
                                    (int(x1) + text_width, int(y1)), (0, 255, 0), -1)
                        cv2.putText(frame, label, (int(x1), int(y1) - 5),
                                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
                    else:
                        # This is an actual disease - track it
                        # Track highest confidence disease for display (only diseases, not healthy)
                        if confidence > highest_confidence:
                            highest_confidence = confidence
                            highest_confidence_disease = formatted_disease_name
                        
                        # Draw red bounding box for diseases
                        cv2.rectangle(frame, (int(x1), int(y1)), (int(x2), int(y2)), (0, 0, 255), 3)
                        
                        # Draw label with disease name and confidence
                        label = f"{formatted_disease_name}: {confidence:.2f}"
                        
                        # Add background rectangle for better visibility
                        (text_width, text_height), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.7, 2)
                        cv2.rectangle(frame, (int(x1), int(y1) - text_height - 10), 
                                    (int(x1) + text_width, int(y1)), (0, 0, 255), -1)
                        
                        cv2.putText(frame, label, (int(x1), int(y1) - 5),
                                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
                        
                        disease_detected = True
                        detection_count += 1
                        detected_diseases.append({
                            "disease": formatted_disease_name,
                            "confidence": float(confidence)
                        })
        
        # Handle detection results - trigger relay ONLY when actual disease is detected (not healthy)
        if disease_detected:
            # Actual disease found (not healthy) - trigger relay with disease name (set to 1, auto-reset after 10s)
            send_detection(highest_confidence_disease)
            
            # Display disease name on frame
            disease_display = detected_disease_name if detected_disease_name else highest_confidence_disease
            
            # Add background for main text
            cv2.rectangle(frame, (5, 5), (frame.shape[1] - 5, 120), (0, 0, 0), -1)
            cv2.rectangle(frame, (5, 5), (frame.shape[1] - 5, 120), (0, 0, 255), 2)
            
            # Determine relay value for display
            relay_display_value = 0
            if disease_detected_flag and detected_disease_name:
                disease_lower = detected_disease_name.lower()
                if "powdery" in disease_lower:
                    relay_display_value = 1
                elif "rust" in disease_lower:
                    relay_display_value = 2
                elif "virus" in disease_lower:
                    relay_display_value = 3
                else:
                    relay_display_value = 1
            
            cv2.putText(frame, f"DISEASE: {disease_display}", (10, 35),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)
            cv2.putText(frame, f"Count: {detection_count} | Confidence: {highest_confidence:.1%}", (10, 65),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
            relay_status = f"SPRAY: {relay_display_value} (Active - Resets in 10s)" if disease_detected_flag else "SPRAY: 0 (Reset)"
            cv2.putText(frame, relay_status, (10, 95),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0) if disease_detected_flag else (128, 128, 128), 2)
        else:
            # No disease detected - but might still be in timer phase OR healthy plant detected
            if detected_disease_name and disease_detected_flag:
                # Still in timer phase from previous detection
                # Add background
                cv2.rectangle(frame, (5, 5), (frame.shape[1] - 5, 90), (0, 0, 0), -1)
                cv2.rectangle(frame, (5, 5), (frame.shape[1] - 5, 90), (255, 165, 0), 2)
                
                # Determine relay value for display
                relay_display_value = 0
                disease_lower = detected_disease_name.lower()
                if "powdery" in disease_lower:
                    relay_display_value = 1
                elif "rust" in disease_lower:
                    relay_display_value = 2
                elif "virus" in disease_lower:
                    relay_display_value = 3
                else:
                    relay_display_value = 1
                
                cv2.putText(frame, f"LAST: {detected_disease_name}", (10, 35),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 165, 0), 2)
                cv2.putText(frame, f"SPRAY: {relay_display_value} (Waiting for auto-reset)", (10, 65),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
            elif healthy_count > 0:
                # Healthy plant detected - relay stays at 0
                # Add background
                cv2.rectangle(frame, (5, 5), (frame.shape[1] - 5, 90), (0, 0, 0), -1)
                cv2.rectangle(frame, (5, 5), (frame.shape[1] - 5, 90), (0, 255, 0), 2)
                
                cv2.putText(frame, f"HEALTHY PLANT DETECTED ({healthy_count})", (10, 35),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
                cv2.putText(frame, "SPRAY: 0 (No Action Required)", (10, 65),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
            else:
                # Nothing detected at all
                # Add background
                cv2.rectangle(frame, (5, 5), (frame.shape[1] - 5, 90), (0, 0, 0), -1)
                cv2.rectangle(frame, (5, 5), (frame.shape[1] - 5, 90), (0, 255, 0), 2)
                
                cv2.putText(frame, "NO DISEASE DETECTED", (10, 35),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
                cv2.putText(frame, "SPRAY: 0 (Monitoring...)", (10, 65),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
        
        return disease_detected, frame
        
    except Exception as e:
        print(f"Error in disease detection: {e}")
        cv2.putText(frame, f"DETECTION ERROR: {str(e)[:50]}", (10, 30),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 2)
        return False, frame

class WebcamStream:
    """External webcam stream handler"""
    def __init__(self, camera_index=0):
        self.camera_index = camera_index
        print(f"Connecting to webcam: Camera {camera_index}")
        
        self.cap = cv2.VideoCapture(camera_index)
        
        # Set camera properties
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        self.cap.set(cv2.CAP_PROP_FPS, 30)
        
        # Verify camera is opened
        if not self.cap.isOpened():
            print(f"Warning: Could not open camera {camera_index}")
            print("Available camera indices to try: 0, 1, 2")
        
        self.ret, self.frame = self.cap.read()
        self.running = True
        
        self.thread = threading.Thread(target=self.update, daemon=True)
        self.thread.start()
        
    def update(self):
        """Update frame in background thread"""
        while self.running:
            if self.cap.isOpened():
                self.ret, self.frame = self.cap.read()
                if not self.ret or self.frame is None:
                    print("Frame read failed")
                    time.sleep(0.1)
                else:
                    time.sleep(0.033)  # ~30 FPS
            else:
                print("Camera not opened, retrying...")
                time.sleep(1)
                
    def read(self):
        """Read current frame"""
        return self.ret, self.frame.copy() if self.frame is not None else (False, None)
    
    def is_opened(self):
        """Check if camera is opened"""
        return self.cap.isOpened()
        
    def release(self):
        """Release camera resources"""
        self.running = False
        if self.thread.is_alive():
            self.thread.join(timeout=1.0)
        self.cap.release()

def run_detection():
    """Main detection loop"""
    global output_frame, frame_lock
    
    # ============================================
    # 🎥 WEBCAM CONFIGURATION
    # ============================================
    # Camera index: 
    #   0 = Default/built-in webcam
    #   1 = First external webcam
    #   2 = Second external webcam
    # Change this value if your external webcam is not detected on index 0
    CAMERA_INDEX = 1  # 👈 CHANGE THIS IF NEEDED (try 0, 1, or 2)
    
    # Initialize webcam
    stream = WebcamStream(CAMERA_INDEX)
    
    time.sleep(2)
    if not stream.is_opened():
        print(f"Failed to open webcam at index {CAMERA_INDEX}")
        print("Try changing CAMERA_INDEX to 1 or 2 if you have multiple cameras")
        return
    
    print("🌿 Plant Disease Detection started!")
    print(f"Webcam: Camera index {CAMERA_INDEX}")
    print("Model: best.pt (Custom Plant Disease Detection)")
    print("Firebase path: /3_Pesticide_Spray/Spray")
    print("Spray Logic: Powdery → Spray=1, Rust → Spray=2, Virus → Spray=3 (10s duration, then auto-reset to 0)")
    
    # Initialize Relay to 0 when camera starts
    print("📍 Initializing Relay state...")
    set_relay_state(0)
    print("✅ Relay initialized to 0 (camera ready)")
    
    try:
        while True:
            ret, frame = stream.read()
            if not ret or frame is None:
                time.sleep(0.01)
                continue
            
            # Process frame for disease detection
            disease_detected, processed_frame = detect_objects(frame)
            
            # Add status info at bottom
            if detected_disease_name:
                status_text = f"Status: {detected_disease_name}"
            else:
                status_text = f"Status: {'DISEASE FOUND' if disease_detected else 'MONITORING'}"
            # Determine spray value for status display
            spray_value = 0
            if disease_detected_flag and detected_disease_name:
                disease_lower = detected_disease_name.lower()
                if "powdery" in disease_lower:
                    spray_value = 1
                elif "rust" in disease_lower:
                    spray_value = 2
                elif "virus" in disease_lower:
                    spray_value = 3
                else:
                    spray_value = 1
            
            spray_text = f"Spray: {spray_value if disease_detected_flag else '0'} {'(10s timer)' if disease_detected_flag else '(INACTIVE)'}"
            cv2.putText(processed_frame, status_text, (10, processed_frame.shape[0] - 50),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
            cv2.putText(processed_frame, spray_text, (10, processed_frame.shape[0] - 20),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255) if disease_detected_flag else (128, 128, 128), 2)
            
            # Add timestamp
            timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
            cv2.putText(processed_frame, timestamp, (10, processed_frame.shape[0] - 80),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
            
            # Update output frame for streaming
            with frame_lock:
                output_frame = processed_frame
            
            time.sleep(0.033)  # ~30 FPS
            
    except KeyboardInterrupt:
        print("Detection stopped by user")
    except Exception as e:
        print(f"Error in detection loop: {e}")
    finally:
        # Cancel any pending timer and set Relay to 0 when camera stops
        global relay_reset_timer
        if relay_reset_timer is not None:
            relay_reset_timer.cancel()
        print("📍 Camera stopping - clearing Relay...")
        set_relay_state(0)
        stream.release()
        print("Camera released")

def generate_video_stream():
    """Generate video stream for Flask"""
    global output_frame, frame_lock
    while True:
        try:
            frame_to_encode = None
            with frame_lock:
                if output_frame is not None:
                    frame_to_encode = output_frame.copy()
            
            if frame_to_encode is None:
                time.sleep(0.033)
                continue
                
            (flag, encodedImage) = cv2.imencode(".jpg", frame_to_encode, 
                                              [cv2.IMWRITE_JPEG_QUALITY, 90])
            if not flag:
                continue
                    
            yield(b'--frame\r\n' b'Content-Type: image/jpeg\r\n\r\n' + 
                  bytearray(encodedImage) + b'\r\n')
        except Exception as e:
            print(f"Error in video stream: {e}")
            time.sleep(0.1)

@app.route("/video_feed")
def video_feed():
    """Video feed route"""
    response = Response(generate_video_stream(), 
                       mimetype="multipart/x-mixed-replace; boundary=frame")
    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response

@app.route("/")
def index():
    """Main page"""
    return """
    <html>
    <head><title>Plant Disease Detection System</title></head>
    <body style="margin: 0; padding: 20px; font-family: Arial, sans-serif;">
        <h1>🌿 Plant Disease Detection System</h1>
        
        <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
            <strong>🌿 Plant Disease Detection with Automatic Relay Control:</strong><br>
            <span style="color: #1b5e20;">• Uses custom-trained YOLO model (best.pt) for plant disease detection</span><br>
            <span style="color: #1b5e20;">• Real-time detection with confidence threshold of 0.5</span><br>
            <span style="color: #1b5e20;">• <strong>Camera Source:</strong> External USB Webcam</span><br>
            <span style="color: #d32f2f;">• <strong>✨ Direct Firebase connection using REST API (NO JSON KEY NEEDED)</strong></span><br>
            <span style="color: #2e7d32;">• <strong>📍 Camera ON:</strong> Relay = 0 (initialized)</span><br>
            <span style="color: #d32f2f;">• <strong>� Disease Detected:</strong> Relay = 1 (activates for 10 seconds)</span><br>
            <span style="color: #ff6f00;">• <strong>⏱️ Auto-Reset:</strong> Relay automatically returns to 0 after 10 seconds</span><br>
            <span style="color: #01579b;">• Firebase path: /3_Pesticide_Spray/Relay (direct value)</span><br>
            <span style="color: #01579b;">• Live video stream with bounding boxes and confidence scores</span><br>
            <span style="color: #01579b;">• Real-time relay state display on video feed</span><br>
        </div>
        
        <div style="margin: 20px 0;">
            <img src="/video_feed" alt="External Webcam Stream - Plant Disease Detection" 
                 style="border: 2px solid #4caf50; border-radius: 8px; max-width: 100%;">
        </div>
        
        <div style="background: #d4edda; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <strong>🧪 Test Relay Control:</strong><br>
            <div style="margin-top: 10px;">
                <button onclick="testDetection()" style="padding: 10px 20px; background: #dc3545; color: white; border: none; border-radius: 5px; cursor: pointer; margin-right: 10px;">
                    Set Relay = 1
                </button>
                <button onclick="manualClear()" style="padding: 10px 20px; background: #28a745; color: white; border: none; border-radius: 5px; cursor: pointer; margin-right: 10px;">
                    Set Relay = 0
                </button>
                <button onclick="checkStatus()" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    Check Status
                </button>
            </div>
            <div id="testResult" style="margin-top: 10px; padding: 10px; background: #f8f9fa; border-radius: 5px; display: none;"></div>
        </div>
        
        <script>
            function testDetection() {
                fetch('/test_detection')
                    .then(response => response.json())
                    .then(data => {
                        const resultDiv = document.getElementById('testResult');
                        resultDiv.style.display = 'block';
                        if (data.success) {
                            resultDiv.style.background = '#f8d7da';
                            resultDiv.innerHTML = '<strong>✅ Success:</strong> ' + data.message;
                        } else {
                            resultDiv.style.background = '#f8d7da';
                            resultDiv.innerHTML = '<strong>❌ Error:</strong> ' + (data.error || data.message);
                        }
                    })
                    .catch(error => {
                        const resultDiv = document.getElementById('testResult');
                        resultDiv.style.display = 'block';
                        resultDiv.style.background = '#f8d7da';
                        resultDiv.innerHTML = '<strong>❌ Error:</strong> ' + error;
                    });
            }
            
            function manualClear() {
                fetch('/manual_clear')
                    .then(response => response.json())
                    .then(data => {
                        const resultDiv = document.getElementById('testResult');
                        resultDiv.style.display = 'block';
                        if (data.success) {
                            resultDiv.style.background = '#d4edda';
                            resultDiv.innerHTML = '<strong>✅ Success:</strong> ' + data.message;
                        } else {
                            resultDiv.style.background = '#f8d7da';
                            resultDiv.innerHTML = '<strong>❌ Error:</strong> ' + (data.error || 'Clear failed');
                        }
                    })
                    .catch(error => {
                        const resultDiv = document.getElementById('testResult');
                        resultDiv.style.display = 'block';
                        resultDiv.style.background = '#f8d7da';
                        resultDiv.innerHTML = '<strong>❌ Error:</strong> ' + error;
                    });
            }
            
            function checkStatus() {
                fetch('/status')
                    .then(response => response.json())
                    .then(data => {
                        const resultDiv = document.getElementById('testResult');
                        resultDiv.style.display = 'block';
                        resultDiv.style.background = '#d1ecf1';
                        let html = '<strong>📊 System Status:</strong><br>';
                        html += '<strong>Model Loaded:</strong> ' + data.model_loaded + '<br>';
                        html += '<strong>Firebase Connected:</strong> ' + data.firebase_connected + '<br>';
                        html += '<strong>Last Relay State:</strong> ' + (data.last_relay_state !== null ? data.last_relay_state : 'Unknown') + '<br>';
                        html += '<strong>Detection Cooldown:</strong> ' + data.detection_cooldown + ' seconds';
                        resultDiv.innerHTML = html;
                    })
                    .catch(error => {
                        const resultDiv = document.getElementById('testResult');
                        resultDiv.style.display = 'block';
                        resultDiv.style.background = '#f8d7da';
                        resultDiv.innerHTML = '<strong>❌ Error:</strong> ' + error;
                    });
            }
        </script>
        
        <div style="font-size: 14px; color: #666;">
            <p><strong>Camera:</strong> External USB Webcam (Camera Index 0)</p>
            <p><strong>AI Model:</strong> Custom Plant Disease Detection (best.pt)</p>
            <p><strong>Firebase:</strong> v2v-communication-d46c6 (REST API - No JSON key needed)</p>
            <p><strong>Detection Path:</strong> /3_Pesticide_Spray/Relay</p>
            <p><strong>Confidence Threshold:</strong> 0.5</p>
            <p><strong>Detection Cooldown:</strong> 2.0 seconds</p>
            <p><strong>Relay Logic:</strong> Disease Detected → Relay=1 (10 seconds) → Auto-reset to 0</p>
            <p><strong>Links:</strong> 
                <a href="/firebase_structure" style="color: #007bff;">View Firebase Structure</a> | 
                <a href="/status" style="color: #007bff;">System Status</a> | 
                <a href="/test" style="color: #007bff;">Test API</a>
            </p>
        </div>
        
        <div style="background: #fff3cd; padding: 10px; border-radius: 5px; margin-top: 15px;">
            <strong>⚠️ Troubleshooting:</strong><br>
            <span style="font-size: 13px;">
                • If camera doesn't work, try changing CAMERA_INDEX in the code (0, 1, or 2)<br>
                • Make sure your external webcam is properly connected via USB<br>
                • Check if webcam is not being used by another application<br>
                • Use the test buttons above to manually control relay state<br>
                • Monitor the terminal/console for detailed logs with emoji indicators<br>
                • <strong>Firebase Rules:</strong> Make sure database rules allow public read/write access
            </span>
        </div>
    </body>
    </html>
    """

@app.route("/test")
def test():
    """Test endpoint"""
    firebase_connected = False
    try:
        response = requests.get(FIREBASE_FULL_URL, timeout=3)
        firebase_connected = (response.status_code == 200)
    except:
        pass
        
    return {
        "status": "Plant Disease Detection System is running!",
        "camera": "External USB Webcam",
        "camera_index": 0,
        "ai_model": "Custom Plant Disease Detection (best.pt)",
        "firebase_project": "v2v-communication-d46c6",
        "firebase_method": "REST API (No JSON key needed)",
        "detection_path": "/3_Pesticide_Spray/Spray",
        "confidence_threshold": 0.5,
        "detection_cooldown": "2.0 seconds",
        "firebase_connected": firebase_connected,
        "relay_logic": "Disease Detected → Relay=1 (10 seconds) → Auto-reset to 0",
        "behavior": "Camera ON → Relay = 0 | Disease Detected → Relay = 1 for 10s → Relay = 0"
    }

@app.route("/firebase_structure")
def firebase_structure():
    """Show Firebase data structure options"""
    return """
    <html>
    <head><title>Firebase Data Structure - Plant Disease Detection</title></head>
    <body style="margin: 0; padding: 20px; font-family: Arial, sans-serif;">
        <h1>🌿 Firebase Data Structure - Plant Disease Relay Control</h1>
        
        <div style="background: #d4edda; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
            <strong>✨ REST API Connection (No JSON Key Needed)</strong><br>
            <p>This system uses Firebase REST API for direct connection without authentication files.</p>
            <p><strong>Database URL:</strong> https://v2v-communication-d46c6-default-rtdb.firebaseio.com</p>
            <p><strong>Path:</strong> /3_Pesticide_Spray/Spray</p>
            <p><strong>Structure:</strong> Direct value (0 or 1) stored at Relay path</p>
        </div>
        
        <h2>Camera Started (Initialization):</h2>
        <pre style="background: #f5f5f5; padding: 15px; border-radius: 8px; overflow-x: auto;">
{
  "3_Pesticide_Spray": {
    "Spray": 0           // 0 = No disease detected (initialized state)
  }
}
        </pre>
        
        <h2>Disease Detected:</h2>
        <pre style="background: #ffcdd2; padding: 15px; border-radius: 8px; overflow-x: auto;">
{
  "3_Pesticide_Spray": {
    "Spray": 1           // 1 = Disease detected (active for 10 seconds)
  }
}
        </pre>
        
        <h2>Auto-Reset After 10 Seconds:</h2>
        <pre style="background: #d4edda; padding: 15px; border-radius: 8px; overflow-x: auto;">
{
  "3_Pesticide_Spray": {
    "Spray": 0           // 0 = Automatically reset to inactive
  }
}
        </pre>
        
        <h2>Relay Behavior with Auto-Reset:</h2>
        <ul>
            <li><strong>Camera ON:</strong> Relay initialized to 0</li>
            <li><strong>Disease Detected:</strong> Relay immediately set to 1</li>
            <li><strong>⏱️ Auto-Reset Timer:</strong> After 10 seconds, Relay automatically returns to 0</li>
            <li><strong>New Detection:</strong> Each new disease detection triggers another 10-second cycle</li>
            <li><strong>Cooldown:</strong> 2-second cooldown between detections to prevent rapid re-triggering</li>
            <li><strong>Camera OFF:</strong> Relay set to 0 on shutdown</li>
            <li><strong>Simple structure:</strong> Just a single value (0 or 1) at the Relay path</li>
        </ul>
        
        <h2>State Transition Diagram:</h2>
        <pre style="background: #e3f2fd; padding: 15px; border-radius: 8px; overflow-x: auto;">
┌──────────────┐
│  Camera ON   │
└──────┬───────┘
       │
       ▼
   Relay = 0 (Initial State)
       │
       │ Disease Detected
       ├────────────────► Relay = 1 (Active)
       │                      │
       │                      │ (10 seconds timer)
       │                      │
       │                      ▼
       └──────────────── Relay = 0 (Auto-Reset)
                             │
                             └──► (Ready for next detection)
        </pre>
        
        <h2>Required Firebase Database Rules:</h2>
        <pre style="background: #f5f5f5; padding: 15px; border-radius: 8px; overflow-x: auto;">
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
        </pre>
        <p style="color: #d32f2f;"><strong>⚠️ Important:</strong> Make sure your Firebase Realtime Database rules allow public read/write access for this REST API method to work.</p>
        
        <h2>Direct REST API Calls:</h2>
        <pre style="background: #f5f5f5; padding: 15px; border-radius: 8px; overflow-x: auto;">
# Set Relay to 1 (objects detected)
PUT https://v2v-communication-d46c6-default-rtdb.firebaseio.com/3_Pesticide_Spray/Spray.json
Body: 1

# Set Relay to 0 (no objects)
PUT https://v2v-communication-d46c6-default-rtdb.firebaseio.com/3_Pesticide_Spray/Spray.json
Body: 0

# Read Relay value
GET https://v2v-communication-d46c6-default-rtdb.firebaseio.com/3_Pesticide_Spray/Spray.json
        </pre>
        
        <h2>Plant Disease Detection Model:</h2>
        <p style="background: #e8f5e9; padding: 15px; border-radius: 8px;">
            This system uses a custom-trained YOLO model (best.pt) specifically designed to detect plant diseases.
            The model has been trained to identify various plant diseases from leaf images in real-time.
            <br><br>
            <strong>Detection Workflow:</strong><br>
            1. Camera captures plant/leaf images continuously<br>
            2. Model analyzes each frame for disease signs<br>
            3. When disease is detected, Relay activates (set to 1)<br>
            4. After 10 seconds, Relay automatically deactivates (set to 0)<br>
            5. System ready for next detection
        </p>
        
        <p><a href="/" style="color: #007bff;">← Back to Main Page</a></p>
    </body>
    </html>
    """

@app.route("/status")
def status():
    """System status endpoint"""
    global last_relay_state, last_detection_time
    
    firebase_connected = False
    try:
        response = requests.get(FIREBASE_FULL_URL, timeout=3)
        firebase_connected = (response.status_code == 200)
    except:
        pass
    
    return {
        "model_loaded": model is not None,
        "model_type": "Custom Plant Disease Detection (best.pt)",
        "model_classes": len(model.names) if model else 0,
        "camera_type": "External USB Webcam",
        "camera_index": 0,
        "firebase_method": "REST API (No JSON key)",
        "firebase_connected": firebase_connected,
        "last_relay_state": last_relay_state,
        "disease_detected_flag": disease_detected_flag,
        "detected_disease_name": detected_disease_name,
        "last_detection_time": last_detection_time,
        "detection_cooldown": detection_cooldown,
        "relay_logic": "Disease Detected → Relay=1 (10 seconds) → Auto-reset to 0",
        "auto_reset_time": "10 seconds"
    }

@app.route("/test_detection")
def test_detection():
    """Manually trigger disease detection (for testing) - sets Relay to 1 with 10s auto-reset"""
    try:
        if send_detection():
            return {
                "success": True,
                "message": "Disease detection triggered - Relay set to 1 (will auto-reset to 0 in 10 seconds)",
                "relay_value": 1,
                "auto_reset": "10 seconds"
            }
        else:
            return {
                "success": False,
                "error": "Failed to trigger detection",
                "message": "Check Firebase connection or detection cooldown"
            }, 500
            
    except Exception as e:
        print(f"❌ Test detection error: {e}")
        import traceback
        traceback.print_exc()
        return {
            "error": str(e),
            "message": "Failed to set relay state"
        }, 500

@app.route("/manual_clear")
def manual_clear():
    """Manually set Relay to 0 (for testing)"""
    result = clear_detection()
    if result:
        return {
            "success": True,
            "message": "Relay set to 0 (detection cleared)"
        }
    else:
        return {
            "error": "Firebase not connected or write failed"
        }, 500

if __name__ == '__main__':
    try:
        print("🌿 Starting Plant Disease Detection System with External Webcam...")
        print("Initializing custom plant disease detection model (best.pt)...")
        
        # Initialize custom plant disease model
        init_yolo_model()
        
        print("Connecting to Firebase using REST API (no JSON key needed)...")
        # Initialize Firebase connection
        init_firebase()
        
        # Start detection in background thread
        detection_thread = threading.Thread(target=run_detection, daemon=True)
        detection_thread.start()
        
        print("Flask server starting on http://localhost:5001")
        print("=" * 60)
        print("🌿 PLANT DISEASE DETECTION SYSTEM")
        print("=" * 60)
        print("📷 Camera: External USB Webcam (Camera Index 0)")
        print("🤖 Model: Custom Plant Disease Detection (best.pt)")
        print("🎯 Confidence threshold: 0.5")
        print("🔥 Firebase: REST API (No JSON key needed)")
        print("📍 Firebase path: /3_Pesticide_Spray/Relay")
        print("⚡ Spray Control Logic:")
        print("   • Camera ON → Spray = 0 (initialized)")
        print("   • 🚨 Powdery Detected → Spray = 1 (activated for 10s)")
        print("   • 🚨 Rust Detected → Spray = 2 (activated for 10s)")
        print("   • 🚨 Virus Detected → Spray = 3 (activated for 10s)")
        print("   • ✅ Healthy Plant → Spray = 0 (no action)")
        print("   • ⏱️  Auto-Reset → Spray = 0 (after 10 seconds)")
        print("\n⏱️  Detection cooldown: 2.0 seconds")
        print("📺 Live video stream: http://localhost:5001/video_feed")
        print("=" * 60)
        print("\n⚠️  If webcam doesn't work, try changing CAMERA_INDEX to 1 or 2")
        print("\n🔥 Make sure Firebase Database Rules allow public read/write:")
        print('   {"rules": {".read": true, ".write": true}}')
        
        app.run(host="0.0.0.0", port=5001, debug=False, threaded=True, use_reloader=False)
        
    except KeyboardInterrupt:
        print("Server stopped by user")
        # Cancel any pending timer and set Relay to 0 on shutdown
        if relay_reset_timer is not None:
            relay_reset_timer.cancel()
        print("Setting Relay to 0 on shutdown...")
        set_relay_state(0)
    except Exception as e:
        print(f"Server error: {e}")
        # Cancel any pending timer
        if relay_reset_timer is not None:
            relay_reset_timer.cancel()