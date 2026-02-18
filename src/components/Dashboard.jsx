// import React, { useState, useEffect, useRef } from 'react';
// import axios from 'axios';
// import './Dashboard.css';

// const API_BASE_URL = 'http://localhost:5000'; // Updated to match Flask server

// const Dashboard = () => {
//     const [isFeedError, setIsFeedError] = useState(false);
//     const [authorisedHistory, setAuthorisedHistory] = useState([]);
//     const [unauthorisedHistory, setUnauthorisedHistory] = useState([]);
//     const [registrationName, setRegistrationName] = useState('');
//     const [registrationStatus, setRegistrationStatus] = useState('');
//     const videoFeedUrl = `${API_BASE_URL}/video_feed`;

//     // Use a ref to prevent caching issues with the video feed
//     const videoRef = useRef(null);

//     useEffect(() => {
//         // Function to fetch history
//         const fetchHistory = () => {
//             axios.get(`${API_BASE_URL}/history`)
//                 .then(response => {
//                     const history = response.data;
//                     setAuthorisedHistory(history.filter(item => item.type === 'Authorised'));
//                     setUnauthorisedHistory(history.filter(item => item.type === 'Unauthorised'));
//                     setIsFeedError(false);
//                 })
//                 .catch(error => {
//                     console.error("History API error:", error);
//                     setIsFeedError(true);
//                 });
//         };

//         fetchHistory(); // Initial fetch
//         const interval = setInterval(fetchHistory, 2000); // Fetch every 2 seconds

//         return () => clearInterval(interval);
//     }, []);

//     const handleRegistration = (e) => {
//         e.preventDefault();
//         if (!registrationName) {
//             setRegistrationStatus('Please enter a name.');
//             return;
//         }
//         setRegistrationStatus('Registering...');
//         axios.post(`${API_BASE_URL}/register`, { name: registrationName })
//             .then(response => {
//                 setRegistrationStatus(response.data.message);
//                 setRegistrationName(''); // Clear input on success
//             })
//             .catch(error => {
//                 setRegistrationStatus(error.response?.data?.error || 'Registration failed.');
//             });
//     };

//     return (
//         <div className="dashboard-container">
//             <div className="dashboard-header">
//                 <h1>AI Surveillance Dashboard</h1>
//             </div>
//             <div className="main-content">
//                 <div className="video-section">
//                     <div className="video-feed-container">
//                         {isFeedError ? (
//                             <div className="error-overlay">
//                                 <p>📷 Video Feed Unavailable</p>
//                                 <span>Could not connect to the stream. Is the Python server running?</span>
//                             </div>
//                         ) : (
//                             <img
//                                 ref={videoRef}
//                                 src={videoFeedUrl}
//                                 alt="Live Video Feed"
//                                 onError={() => setIsFeedError(true)}
//                             />
//                         )}
//                     </div>
//                 </div>

//                 {/* <div className="side-panel">

//                     <div className="registration-panel card">
//                         <h2><i className="fas fa-user-plus"></i> Register New Face</h2>
//                         <form onSubmit={handleRegistration}>
//                             <input
//                                 type="text"
//                                 value={registrationName}
//                                 onChange={(e) => setRegistrationName(e.target.value)}
//                                 placeholder="Enter name..."
//                                 className="registration-input"
//                             />
//                             <button type="submit" className="registration-button">
//                                 Register Face
//                             </button>
//                         </form>
//                         {registrationStatus && <p className="registration-status">{registrationStatus}</p>}
//                     </div>


//                     <div className="history-panel card">
//                         <h3><i className="fas fa-check-circle"></i> Authorised Detections</h3>
//                         <ul className="history-list">
//                             {authorisedHistory.length > 0 ? authorisedHistory.slice(0, 5).map((item, index) => (
//                                 <li key={index} className="history-item authorised">
//                                     <span>{item.name}</span>
//                                     <span className="history-time">{item.timestamp.split(' ')[1]}</span>
//                                 </li>
//                             )) : <li>No authorised persons detected.</li>}
//                         </ul>
//                     </div>


//                     <div className="history-panel card">
//                         <h3><i className="fas fa-exclamation-triangle"></i> Unauthorised Detections</h3>
//                         <ul className="history-list">
//                             {unauthorisedHistory.length > 0 ? unauthorisedHistory.slice(0, 5).map((item, index) => (
//                                 <li key={index} className="history-item unauthorised">
//                                     <span>{item.name}</span>
//                                     <span className="history-time">{item.timestamp.split(' ')[1]}</span>
//                                 </li>
//                             )) : <li>Area clear of unknown persons.</li>}
//                         </ul>
//                     </div>
//                 </div> */}
//             </div>
//         </div>
//     );
// };

// export default Dashboard;













// import React, { useState, useEffect, useRef } from 'react';
// import axios from 'axios';
// import './Dashboard.css';

// const API_BASE_URL = 'http://localhost:5001'; // Make sure this matches your Flask server port

// const Dashboard = () => {
//     const [isFeedError, setIsFeedError] = useState(false);
//     const [systemStatus, setSystemStatus] = useState({
//         model_loaded: false,
//         firebase_connected: false,
//         last_detection: 0,
//         detection_cooldown: 0,
//         auto_clear_delay: 0,
//         auto_clear_timer: { active: false, remaining_seconds: 0 }
//     });
//     const [detectionHistory, setDetectionHistory] = useState([]);
//     const [lastError, setLastError] = useState('');
//     const [connectionStatus, setConnectionStatus] = useState('connecting');
//     const [manualClearStatus, setManualClearStatus] = useState('');
//     const [debugInfo, setDebugInfo] = useState('');

//     const videoFeedUrl = `${API_BASE_URL}/video_feed`;
//     const videoRef = useRef(null);

//     useEffect(() => {
//         // Add debug info
//         setDebugInfo(`Connecting to: ${API_BASE_URL} from: ${window.location.origin}`);

//         // Function to fetch system status
//         const fetchStatus = () => {
//             axios.get(`${API_BASE_URL}/status`, {
//                 timeout: 5000,
//                 headers: {
//                     'Content-Type': 'application/json'
//                 }
//             })
//                 .then(response => {
//                     setSystemStatus(response.data);
//                     setConnectionStatus('connected');
//                     setIsFeedError(false);
//                     setLastError('');

//                     // Add to detection history if there's a recent detection
//                     if (response.data.last_detection && response.data.last_detection > 0) {
//                         const detectionTime = new Date(response.data.last_detection * 1000);
//                         const newEntry = {
//                             type: response.data.auto_clear_timer.active ? 'Object Detected' : 'System Clear',
//                             timestamp: detectionTime.toLocaleString(),
//                             status: response.data.auto_clear_timer.active ? 'active' : 'cleared'
//                         };

//                         setDetectionHistory(prev => {
//                             const exists = prev.find(item =>
//                                 Math.abs(new Date(item.timestamp).getTime() - detectionTime.getTime()) < 5000
//                             );
//                             if (!exists) {
//                                 return [newEntry, ...prev.slice(0, 9)]; // Keep last 10 entries
//                             }
//                             return prev;
//                         });
//                     }
//                 })
//                 .catch(error => {
//                     console.error("Status API error:", error);
//                     setConnectionStatus('disconnected');

//                     let errorMessage = 'Connection failed';
//                     if (error.code === 'ERR_NETWORK') {
//                         errorMessage = 'Network error - Is Flask server running on port 5000?';
//                     } else if (error.message.includes('CORS')) {
//                         errorMessage = 'CORS error - Check Flask server CORS configuration';
//                     } else if (error.response) {
//                         errorMessage = `Server error: ${error.response.status}`;
//                     }

//                     setLastError(errorMessage);
//                     setIsFeedError(true);
//                 });
//         };

//         // Function to test API connectivity
//         const testAPI = () => {
//             axios.get(`${API_BASE_URL}/test`)
//                 .then(response => {
//                     console.log('API Test successful:', response.data);
//                 })
//                 .catch(error => {
//                     console.error('API Test failed:', error);
//                 });
//         };

//         // Initial calls
//         testAPI();
//         fetchStatus();

//         // Set up periodic status updates
//         const statusInterval = setInterval(fetchStatus, 1000); // Update every second for timer

//         return () => clearInterval(statusInterval);
//     }, []);

//     const handleManualClear = () => {
//         setManualClearStatus('Clearing detection...');
//         // Since there's no manual clear endpoint, we'll just show status
//         setTimeout(() => {
//             setManualClearStatus('System will auto-clear when no Object is detected');
//         }, 1000);
//         setTimeout(() => setManualClearStatus(''), 3000);
//     };

//     const formatTimestamp = (timestamp) => {
//         if (!timestamp) return 'Never';
//         return new Date(timestamp * 1000).toLocaleString();
//     };

//     const getConnectionStatusIcon = () => {
//         switch (connectionStatus) {
//             case 'connected':
//                 return '🟢';
//             case 'disconnected':
//                 return '🔴';
//             default:
//                 return '🟡';
//         }
//     };

//     return (
//         <div className="dashboard-container">
//             <div className="dashboard-header">
//                 <h1>🌞UV - Sanitization System</h1>
//             </div>

//             <div className="main-content">
//                 <div className="video-section">
//                     <div className="video-feed-container">
//                         {isFeedError ? (
//                             <div className="error-overlay">
//                                 <p>📷 Camera Feed Unavailable</p>
//                                 <span>Could not connect to the Object detection camera.</span>
//                                 <br />
//                                 <small style={{ color: '#ff6b6b', marginTop: '10px', display: 'block' }}>
//                                     {getConnectionStatusIcon()} Server: {connectionStatus}
//                                     {lastError && ` - ${lastError}`}
//                                 </small>
//                             </div>
//                         ) : (
//                             <img
//                                 ref={videoRef}
//                                 src={`${videoFeedUrl}?t=${Date.now()}`}
//                                 alt="UV - Sanitization Feed"
//                                 onError={() => setIsFeedError(true)}
//                                 onLoad={() => setIsFeedError(false)}
//                             />
//                         )}
//                     </div>
//                 </div>

//                 <div className="side-panel">
//                     {/* System Status Panel */}
//                     <div className="registration-panel card">
//                         <h2>
//                             <i className="fas fa-cogs"></i>
//                             System Status
//                         </h2>
//                         <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
//                             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
//                                 <span style={{ color: 'var(--text-secondary)' }}>
//                                     <i className="fas fa-robot"></i> AI Model:
//                                 </span>
//                                 <span style={{
//                                     color: systemStatus.model_loaded ? 'var(--authorised-color)' : 'var(--unauthorised-color)',
//                                     fontWeight: '600'
//                                 }}>
//                                     {systemStatus.model_loaded ? 'Loaded ✅' : 'Failed ❌'}
//                                 </span>
//                             </div>

//                             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
//                                 <span style={{ color: 'var(--text-secondary)' }}>
//                                     <i className="fas fa-database"></i> Firebase:
//                                 </span>
//                                 <span style={{
//                                     color: systemStatus.firebase_connected ? 'var(--authorised-color)' : 'var(--unauthorised-color)',
//                                     fontWeight: '600'
//                                 }}>
//                                     {systemStatus.firebase_connected ? 'Connected ✅' : 'Disconnected ❌'}
//                                 </span>
//                             </div>

//                             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
//                                 <span style={{ color: 'var(--text-secondary)' }}>
//                                     <i className="fas fa-clock"></i> Auto-Clear Timer:
//                                 </span>
//                                 <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>
//                                     {systemStatus.auto_clear_delay}s
//                                 </span>
//                             </div>

//                             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
//                                 <span style={{ color: 'var(--text-secondary)' }}>
//                                     {getConnectionStatusIcon()} Connection:
//                                 </span>
//                                 <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>
//                                     {connectionStatus}
//                                 </span>
//                             </div>
//                         </div>

//                         {/* Manual Clear Button */}
//                         <button
//                             className="registration-button"
//                             onClick={handleManualClear}
//                             style={{ marginTop: '15px' }}
//                         >
//                             <i className="fas fa-broom"></i> System Info
//                         </button>
//                         {manualClearStatus && (
//                             <p className="registration-status">{manualClearStatus}</p>
//                         )}

//                         {/* Debug Info */}
//                         {debugInfo && (
//                             <div style={{
//                                 marginTop: '10px',
//                                 padding: '8px',
//                                 background: 'var(--bg-secondary)',
//                                 borderRadius: '4px',
//                                 fontSize: '0.75rem',
//                                 color: 'var(--text-muted)'
//                             }}>
//                                 {debugInfo}
//                             </div>
//                         )}
//                     </div>

//                     {/* Active Detection Status */}
//                     <div className="history-panel card">
//                         <h3>
//                             <i className="fas fa-eye" style={{ color: systemStatus.auto_clear_timer.active ? '#f39c12' : 'var(--authorised-color)' }}></i>
//                             Detection Status
//                         </h3>

//                         {systemStatus.auto_clear_timer.active ? (
//                             <div style={{
//                                 background: 'rgba(243, 156, 18, 0.1)',
//                                 border: '1px solid rgba(243, 156, 18, 0.3)',
//                                 borderRadius: '8px',
//                                 padding: '15px',
//                                 textAlign: 'center'
//                             }}>
//                                 <div style={{
//                                     fontSize: '1.2rem',
//                                     fontWeight: '700',
//                                     color: '#f39c12',
//                                     marginBottom: '10px'
//                                 }}>
//                                     ⏰ {Math.ceil(systemStatus.auto_clear_timer.remaining_seconds)}s
//                                 </div>

//                                 <div style={{
//                                     width: '100%',
//                                     height: '8px',
//                                     background: 'var(--bg-secondary)',
//                                     borderRadius: '4px',
//                                     overflow: 'hidden',
//                                     marginBottom: '8px'
//                                 }}>
//                                     <div style={{
//                                         height: '100%',
//                                         background: 'linear-gradient(90deg, #f39c12, #e67e22)',
//                                         width: `${(systemStatus.auto_clear_timer.remaining_seconds / systemStatus.auto_clear_delay) * 100}%`,
//                                         transition: 'width 1s linear',
//                                         borderRadius: '4px'
//                                     }}></div>
//                                 </div>

//                                 <small style={{ color: '#f39c12', fontStyle: 'italic' }}>
//                                     🚨 detected! Auto-clearing Firebase...
//                                 </small>
//                             </div>
//                         ) : (
//                             <div style={{
//                                 textAlign: 'center',
//                                 padding: '20px',
//                                 color: 'var(--text-muted)'
//                             }}>
//                                 <div style={{ fontSize: '1.1rem', marginBottom: '8px' }}>
//                                     ✅ System Clear
//                                 </div>
//                                 <small>Monitoring for dust detection...</small>
//                             </div>
//                         )}

//                         <div style={{
//                             marginTop: '15px',
//                             padding: '10px 0',
//                             borderTop: '1px solid rgba(255, 255, 255, 0.1)',
//                             fontSize: '0.9rem',
//                             color: 'var(--text-secondary)'
//                         }}>
//                             <strong>Last Detection:</strong><br />
//                             {formatTimestamp(systemStatus.last_detection)}
//                         </div>
//                     </div>

//                     {/* Detection History */}
//                     <div className="history-panel card">
//                         <h3>
//                             <i className="fas fa-history"></i>
//                             Recent Activity
//                         </h3>
//                         <ul className="history-list">
//                             {detectionHistory.length > 0 ? detectionHistory.slice(0, 5).map((item, index) => (
//                                 <li key={index} className={`history-item ${item.status === 'active' ? 'unauthorised' : 'authorised'}`}>
//                                     <span>
//                                         {item.status === 'active' ? '🔴' : '🟢'} {item.type}
//                                     </span>
//                                     <span className="history-time">
//                                         {new Date(item.timestamp).toLocaleTimeString()}
//                                     </span>
//                                 </li>
//                             )) : (
//                                 <li style={{
//                                     textAlign: 'center',
//                                     padding: '20px',
//                                     color: 'var(--text-muted)',
//                                     fontStyle: 'italic'
//                                 }}>
//                                     No recent detections
//                                 </li>
//                             )}
//                         </ul>
//                     </div>

//                     {/* System Information */}
//                     <div className="history-panel card">
//                         <h3>
//                             <i className="fas fa-info-circle"></i>
//                             System Info
//                         </h3>
//                         <div style={{
//                             display: 'flex',
//                             flexDirection: 'column',
//                             gap: '8px',
//                             fontSize: '0.9rem',
//                             color: 'var(--text-secondary)'
//                         }}>
//                             <div><strong style={{ color: 'var(--text-primary)' }}>Model:</strong> YOLOv8 (best.pt)</div>
//                             <div><strong style={{ color: 'var(--text-primary)' }}>Confidence:</strong> 0.5 threshold</div>
//                             <div><strong style={{ color: 'var(--text-primary)' }}>Camera:</strong> V380 Pro</div>
//                             <div><strong style={{ color: 'var(--text-primary)' }}>Firebase Path:</strong> /UV_Sanitization/Relay</div>
//                             <div style={{
//                                 marginTop: '10px',
//                                 padding: '10px',
//                                 background: 'var(--bg-glass)',
//                                 borderRadius: '6px',
//                                 fontSize: '0.85rem',
//                                 fontStyle: 'italic'
//                             }}>
//                                 <strong>Logic:</strong> Object detected → Set to 1 → Auto-clear to 0 after 10s
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             </div>
//         </div>
//     );
// };

// export default Dashboard;















import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { db } from '../services/firebase';
import { ref, onValue } from 'firebase/database';
import './Dashboard.css';

const API_BASE_URL = 'http://localhost:5001'; // Make sure this matches your Flask server port

const Dashboard = () => {
    const [isFeedError, setIsFeedError] = useState(false);
    const [systemStatus, setSystemStatus] = useState({
        model_loaded: false,
        firebase_connected: false,
        last_relay_state: null,
        last_detection_time: 0,
        detection_cooldown: 0,
        relay_logic: 'Real-time (1 when objects detected, 0 when no objects)'
    });
    const [detectionHistory, setDetectionHistory] = useState([]);
    const [lastError, setLastError] = useState('');
    const [connectionStatus, setConnectionStatus] = useState('connecting');
    const [manualClearStatus, setManualClearStatus] = useState('');
    const [debugInfo, setDebugInfo] = useState('');

    // Voltage and Current monitoring state
    const [voltageData, setVoltageData] = useState({
        current: 0,
        history: [],
        points: ''
    });
    const [currentData, setCurrentData] = useState({
        current: 0,
        history: [],
        points: ''
    });

    const MAX_HISTORY_POINTS = 20; // Number of points to show in graph

    const videoFeedUrl = `${API_BASE_URL}/video_feed`;
    const videoRef = useRef(null);

    useEffect(() => {
        // Add debug info
        setDebugInfo(`Connecting to: ${API_BASE_URL} from: ${window.location.origin}`);

        // Function to fetch system status
        const fetchStatus = () => {
            axios.get(`${API_BASE_URL}/status`, {
                timeout: 5000,
                headers: {
                    'Content-Type': 'application/json'
                }
            })
                .then(response => {
                    setSystemStatus(response.data);
                    setConnectionStatus('connected');
                    setIsFeedError(false);
                    setLastError('');

                    // Add to detection history based on relay state changes
                    if (response.data.last_relay_state !== null) {
                        const detectionTime = new Date(response.data.last_detection_time * 1000);
                        const newEntry = {
                            type: response.data.last_relay_state === 1 ? 'Object Detected' : 'Area Clear',
                            timestamp: detectionTime.toLocaleString(),
                            status: response.data.last_relay_state === 1 ? 'active' : 'cleared',
                            relayState: response.data.last_relay_state
                        };

                        setDetectionHistory(prev => {
                            // Only add if timestamp is different or state changed
                            const exists = prev.find(item =>
                                Math.abs(new Date(item.timestamp).getTime() - detectionTime.getTime()) < 2000 &&
                                item.relayState === newEntry.relayState
                            );
                            if (!exists && response.data.last_detection_time > 0) {
                                return [newEntry, ...prev.slice(0, 9)]; // Keep last 10 entries
                            }
                            return prev;
                        });
                    }
                })
                .catch(error => {
                    console.error("Status API error:", error);
                    setConnectionStatus('disconnected');

                    let errorMessage = 'Connection failed';
                    if (error.code === 'ERR_NETWORK') {
                        errorMessage = 'Network error - Is Flask server running on port 5001?';
                    } else if (error.message.includes('CORS')) {
                        errorMessage = 'CORS error - Check Flask server CORS configuration';
                    } else if (error.response) {
                        errorMessage = `Server error: ${error.response.status}`;
                    }

                    setLastError(errorMessage);
                    setIsFeedError(true);
                });
        };

        // Function to test API connectivity
        const testAPI = () => {
            axios.get(`${API_BASE_URL}/test`)
                .then(response => {
                    console.log('API Test successful:', response.data);
                })
                .catch(error => {
                    console.error('API Test failed:', error);
                });
        };

        // Initial calls
        testAPI();
        fetchStatus();

        // Set up periodic status updates
        const statusInterval = setInterval(fetchStatus, 1000); // Update every second

        return () => clearInterval(statusInterval);
    }, []);

    // Generate SVG points for graph from data array
    const generateGraphPoints = (data, width = 300, height = 100, maxValue = 15) => {
        if (data.length === 0) return '';

        const points = data.map((value, index) => {
            const x = (index / (MAX_HISTORY_POINTS - 1)) * width;
            const y = height - ((value / maxValue) * height);
            return `${x},${y}`;
        }).join(' ');

        return points;
    };

    // Firebase listener for Voltage and Current
    useEffect(() => {
        const voltageRef = ref(db, '3_Pesticide_Spray/Voltage');
        const currentRef = ref(db, '3_Pesticide_Spray/Current');

        const voltageListener = onValue(voltageRef, (snapshot) => {
            const voltage = snapshot.val();
            if (voltage !== null && voltage !== undefined) {
                setVoltageData(prev => {
                    const newHistory = [...prev.history, parseFloat(voltage)].slice(-MAX_HISTORY_POINTS);
                    return {
                        current: parseFloat(voltage).toFixed(2),
                        history: newHistory,
                        points: generateGraphPoints(newHistory)
                    };
                });
            }
        });

        const currentListener = onValue(currentRef, (snapshot) => {
            const current = snapshot.val();
            if (current !== null && current !== undefined) {
                setCurrentData(prev => {
                    const newHistory = [...prev.history, parseFloat(current)].slice(-MAX_HISTORY_POINTS);
                    return {
                        current: parseFloat(current).toFixed(2),
                        history: newHistory,
                        points: generateGraphPoints(newHistory, 300, 100, 5) // Max 5A for current
                    };
                });
            }
        });

        return () => {
            voltageListener();
            currentListener();
        };
    }, []);

    const handleManualTest = () => {
        setManualClearStatus('Testing relay control...');

        // Test by setting relay to 1
        axios.get(`${API_BASE_URL}/test_detection`)
            .then(response => {
                setManualClearStatus('✅ Relay set to 1 (Test successful)');
                setTimeout(() => setManualClearStatus(''), 3000);
            })
            .catch(error => {
                setManualClearStatus('❌ Test failed');
                setTimeout(() => setManualClearStatus(''), 3000);
            });
    };

    const handleManualClear = () => {
        setManualClearStatus('Clearing relay...');

        // Clear by setting relay to 0
        axios.get(`${API_BASE_URL}/manual_clear`)
            .then(response => {
                setManualClearStatus('✅ Relay set to 0 (Cleared)');
                setTimeout(() => setManualClearStatus(''), 3000);
            })
            .catch(error => {
                setManualClearStatus('❌ Clear failed');
                setTimeout(() => setManualClearStatus(''), 3000);
            });
    };

    const formatTimestamp = (timestamp) => {
        if (!timestamp || timestamp === 0) return 'Never';
        return new Date(timestamp * 1000).toLocaleString();
    };

    const getConnectionStatusIcon = () => {
        switch (connectionStatus) {
            case 'connected':
                return '🟢';
            case 'disconnected':
                return '🔴';
            default:
                return '🟡';
        }
    };

    const getRelayStateDisplay = () => {
        if (systemStatus.last_relay_state === null) {
            return { icon: '⚪', text: 'Unknown', color: 'var(--text-muted)' };
        } else if (systemStatus.last_relay_state === 1) {
            return { icon: '🔴', text: 'ACTIVE (Objects Detected)', color: '#f39c12' };
        } else {
            return { icon: '🟢', text: 'INACTIVE (No Objects)', color: 'var(--authorised-color)' };
        }
    };

    const relayState = getRelayStateDisplay();

    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <h1>� Plant Disease Detection System</h1>
            </div>

            <div className="main-content">
                <div className="video-section">
                    <div className="video-feed-container">
                        {isFeedError ? (
                            <div className="error-overlay">
                                <p>📷 Camera Feed Unavailable</p>
                                <span>Could not connect to the Object detection camera.</span>
                                <br />
                                <small style={{ color: '#ff6b6b', marginTop: '10px', display: 'block' }}>
                                    {getConnectionStatusIcon()} Server: {connectionStatus}
                                    {lastError && ` - ${lastError}`}
                                </small>
                            </div>
                        ) : (
                            <img
                                ref={videoRef}
                                src={`${videoFeedUrl}?t=${Date.now()}`}
                                alt="Plant Disease Detection Feed"
                                onError={() => setIsFeedError(true)}
                                onLoad={() => setIsFeedError(false)}
                            />
                        )}
                    </div>
                </div>

                <div className="side-panel">
                    {/* System Status Panel */}
                    <div className="registration-panel card">
                        <h2>
                            <i className="fas fa-cogs"></i>
                            System Status
                        </h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>
                                    <i className="fas fa-robot"></i> AI Model:
                                </span>
                                <span style={{
                                    color: systemStatus.model_loaded ? 'var(--authorised-color)' : 'var(--unauthorised-color)',
                                    fontWeight: '600'
                                }}>
                                    {systemStatus.model_loaded ? 'Loaded ✅' : 'Failed ❌'}
                                </span>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>
                                    <i className="fas fa-database"></i> Firebase:
                                </span>
                                <span style={{
                                    color: systemStatus.firebase_connected ? 'var(--authorised-color)' : 'var(--unauthorised-color)',
                                    fontWeight: '600'
                                }}>
                                    {systemStatus.firebase_connected ? 'Connected ✅' : 'Disconnected ❌'}
                                </span>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>
                                    <i className="fas fa-toggle-on"></i> Relay State:
                                </span>
                                <span style={{ color: relayState.color, fontWeight: '600' }}>
                                    {relayState.icon} {systemStatus.last_relay_state !== null ? systemStatus.last_relay_state : '?'}
                                </span>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>
                                    {getConnectionStatusIcon()} Connection:
                                </span>
                                <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>
                                    {connectionStatus}
                                </span>
                            </div>
                        </div>

                        {/* Manual Control Buttons */}
                        <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                            <button
                                className="registration-button"
                                onClick={handleManualTest}
                                style={{ flex: 1, fontSize: '0.9rem', padding: '0.6rem' }}
                            >
                                <i className="fas fa-power-off"></i> Test (Set 1)
                            </button>
                            <button
                                className="registration-button"
                                onClick={handleManualClear}
                                style={{
                                    flex: 1,
                                    fontSize: '0.9rem',
                                    padding: '0.6rem',
                                    background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)'
                                }}
                            >
                                <i className="fas fa-broom"></i> Clear (Set 0)
                            </button>
                        </div>

                        {manualClearStatus && (
                            <p className="registration-status">{manualClearStatus}</p>
                        )}

                        {/* Debug Info */}
                        {debugInfo && (
                            <div style={{
                                marginTop: '10px',
                                padding: '8px',
                                background: 'var(--bg-secondary)',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                color: 'var(--text-muted)'
                            }}>
                                {debugInfo}
                            </div>
                        )}
                    </div>

                    {/* Voltage & Current Monitoring */}
                    <div className="history-panel card">
                        <h3>
                            <i className="fas fa-bolt" style={{ color: '#ffc107' }}></i>
                            Power Monitoring
                        </h3>

                        {/* Current Values Display */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '15px',
                            marginBottom: '20px'
                        }}>
                            <div style={{
                                background: 'rgba(33, 150, 243, 0.1)',
                                border: '1px solid rgba(33, 150, 243, 0.3)',
                                borderRadius: '8px',
                                padding: '15px',
                                textAlign: 'center'
                            }}>
                                <div style={{
                                    fontSize: '0.85rem',
                                    color: 'var(--text-secondary)',
                                    marginBottom: '5px'
                                }}>
                                    ⚡ Voltage
                                </div>
                                <div style={{
                                    fontSize: '1.8rem',
                                    fontWeight: '700',
                                    color: '#2196f3'
                                }}>
                                    {voltageData.current}V
                                </div>
                            </div>

                            <div style={{
                                background: 'rgba(255, 152, 0, 0.1)',
                                border: '1px solid rgba(255, 152, 0, 0.3)',
                                borderRadius: '8px',
                                padding: '15px',
                                textAlign: 'center'
                            }}>
                                <div style={{
                                    fontSize: '0.85rem',
                                    color: 'var(--text-secondary)',
                                    marginBottom: '5px'
                                }}>
                                    🔌 Current
                                </div>
                                <div style={{
                                    fontSize: '1.8rem',
                                    fontWeight: '700',
                                    color: '#ff9800'
                                }}>
                                    {currentData.current}A
                                </div>
                            </div>
                        </div>

                        {/* Voltage Graph */}
                        <div style={{ marginBottom: '20px' }}>
                            <h4 style={{
                                fontSize: '0.9rem',
                                marginBottom: '10px',
                                color: 'var(--text-primary)'
                            }}>
                                Voltage History
                            </h4>
                            <div style={{
                                background: 'var(--bg-glass)',
                                borderRadius: '8px',
                                padding: '15px',
                                height: '120px',
                                position: 'relative'
                            }}>
                                <svg width="100%" height="100%" style={{ display: 'block' }}>
                                    <polyline
                                        fill="none"
                                        stroke="#2196f3"
                                        strokeWidth="2"
                                        points={voltageData.points}
                                    />
                                </svg>
                                {voltageData.history.length === 0 && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '50%',
                                        left: '50%',
                                        transform: 'translate(-50%, -50%)',
                                        color: 'var(--text-muted)',
                                        fontSize: '0.85rem'
                                    }}>
                                        Waiting for data...
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Current Graph */}
                        <div>
                            <h4 style={{
                                fontSize: '0.9rem',
                                marginBottom: '10px',
                                color: 'var(--text-primary)'
                            }}>
                                Current History
                            </h4>
                            <div style={{
                                background: 'var(--bg-glass)',
                                borderRadius: '8px',
                                padding: '15px',
                                height: '120px',
                                position: 'relative'
                            }}>
                                <svg width="100%" height="100%" style={{ display: 'block' }}>
                                    <polyline
                                        fill="none"
                                        stroke="#ff9800"
                                        strokeWidth="2"
                                        points={currentData.points}
                                    />
                                </svg>
                                {currentData.history.length === 0 && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '50%',
                                        left: '50%',
                                        transform: 'translate(-50%, -50%)',
                                        color: 'var(--text-muted)',
                                        fontSize: '0.85rem'
                                    }}>
                                        Waiting for data...
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* System Information */}
                    {/* <div className="history-panel card">
                        <h3>
                            <i className="fas fa-info-circle"></i>
                            System Info
                        </h3>
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            fontSize: '0.9rem',
                            color: 'var(--text-secondary)'
                        }}>
                            <div><strong style={{ color: 'var(--text-primary)' }}>Model:</strong> Plant Disease Detection (best.pt)</div>
                            <div><strong style={{ color: 'var(--text-primary)' }}>Confidence:</strong> 0.5 threshold</div>
                            <div><strong style={{ color: 'var(--text-primary)' }}>Camera:</strong> External USB Webcam</div>
                            <div><strong style={{ color: 'var(--text-primary)' }}>Firebase Path:</strong> /3_Pesticide_Spray/Spray</div>
                            <div><strong style={{ color: 'var(--text-primary)' }}>Connection:</strong> REST API (Direct)</div>
                            <div><strong style={{ color: 'var(--text-primary)' }}>Cooldown:</strong> {systemStatus.detection_cooldown}s</div>
                            <div style={{
                                marginTop: '10px',
                                padding: '10px',
                                background: 'var(--bg-glass)',
                                borderRadius: '6px',
                                fontSize: '0.85rem',
                                fontStyle: 'italic'
                            }}>
                                <strong>Spray Logic:</strong> Powdery→1, Rust→2, Virus→3 (10s duration, auto-reset to 0)
                            </div>
                        </div>
                    </div> */}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;