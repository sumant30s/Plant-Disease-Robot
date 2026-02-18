import React, { useState } from 'react';
import { db } from '../services/firebase';
import { ref, set } from 'firebase/database';
import './ManualControl.css';

const ManualControl = () => {
    const [lastCommand, setLastCommand] = useState('');
    const [commandTime, setCommandTime] = useState('');
    const [lastSprayCommand, setLastSprayCommand] = useState('');
    const [sprayCommandTime, setSprayCommandTime] = useState('');

    const sendDirection = async (direction) => {
        try {
            await set(ref(db, '3_Pesticide_Spray'), {
                direction: direction,
                duration: 0, // Manual commands don't have duration
                timestamp: new Date().toISOString(),
                manual: true // Flag to indicate manual control
            });

            setLastCommand(direction);
            setCommandTime(new Date().toLocaleTimeString());
            console.log(`Manual command sent: ${direction}`);
        } catch (error) {
            console.error('Error sending direction to Firebase:', error);
            alert('Failed to send command. Please check your connection.');
        }
    };

    const setIdle = async () => {
        try {
            await set(ref(db, '3_Pesticide_Spray'), {
                direction: 'S',
                duration: 0,
                timestamp: new Date().toISOString(),
                manual: true
            });

            setLastCommand('IDLE');
            setCommandTime(new Date().toLocaleTimeString());
            console.log('Robot set to idle');
        } catch (error) {
            console.error('Error setting robot to idle:', error);
            alert('Failed to set robot to idle. Please check your connection.');
        }
    };

    const sendSprayCommand = async (sprayValue, diseaseName) => {
        try {
            await set(ref(db, '3_Pesticide_Spray/Spray'), sprayValue);

            setLastSprayCommand(diseaseName);
            setSprayCommandTime(new Date().toLocaleTimeString());
            console.log(`Spray command sent: ${diseaseName} (value: ${sprayValue})`);
        } catch (error) {
            console.error('Error sending spray command to Firebase:', error);
            alert('Failed to send spray command. Please check your connection.');
        }
    };

    return (
        <div className="manual-control-panel">
            <div className="manual-control-container">
                <div className="control-section">
                    <h2>Manual Robot Control</h2>
                    <p className="control-description">
                        Use the directional buttons below to manually control the robot movement.
                        Each button sends an immediate command to the robot.
                    </p>

                    <div className="manual-movement-controls">
                        <div className="control-row top-row">
                            <button
                                className="direction-btn btn-left"
                                onClick={() => sendDirection('L')}
                                title="Turn Left"
                            >
                                Left
                            </button>
                        </div>

                        <div className="control-row middle-row">
                            <button
                                className="direction-btn btn-forward"
                                onClick={() => sendDirection('F')}
                                title="Move Forward"
                            >
                                Forward
                            </button>

                            <button
                                className="direction-btn btn-idle"
                                onClick={setIdle}
                                title="Stop"
                            >
                                Stop
                            </button>
                            <button
                                className="direction-btn btn-backward"
                                onClick={() => sendDirection('B')}
                                title="Move Backward"
                            >
                                Backward
                            </button>

                        </div>

                        <div className="control-row bottom-row">
                            <button
                                className="direction-btn btn-right"
                                onClick={() => sendDirection('R')}
                                title="Turn Right"
                            >
                                Right
                            </button>
                        </div>
                    </div>

                    {/* {lastCommand && (
                        <div className="command-status">
                            <div className="status-indicator">
                                <h3>Last Command</h3>
                                <div className="status-details">
                                    <span className="command-sent">Command: <strong>{lastCommand}</strong></span>
                                    <span className="command-timestamp">Time: {commandTime}</span>
                                </div>
                            </div>
                        </div>
                    )} */}

                    {/* Spray Control Section */}
                    <div className="spray-control-section" style={{ marginTop: '30px' }}>
                        <h2>🌿 Pesticide Spray Control</h2>
                        <p className="control-description">
                            Manually trigger specific pesticide sprays for different plant diseases.
                        </p>

                        <div className="spray-controls" style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, 1fr)',
                            gap: '15px',
                            marginTop: '20px'
                        }}>
                            <button
                                className="spray-btn btn-powdery"
                                onClick={() => sendSprayCommand(1, 'Powdery')}
                                style={{
                                    padding: '20px',
                                    fontSize: '16px',
                                    backgroundColor: '#9c27b0',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                    transition: 'all 0.3s'
                                }}
                                title="Spray for Powdery disease"
                            >
                                💜 Spray for Powdery
                            </button>

                            <button
                                className="spray-btn btn-rust"
                                onClick={() => sendSprayCommand(2, 'Rust')}
                                style={{
                                    padding: '20px',
                                    fontSize: '16px',
                                    backgroundColor: '#ff5722',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                    transition: 'all 0.3s'
                                }}
                                title="Spray for Rust disease"
                            >
                                🟠 Spray for Rust
                            </button>

                            <button
                                className="spray-btn btn-virus"
                                onClick={() => sendSprayCommand(3, 'Virus')}
                                style={{
                                    padding: '20px',
                                    fontSize: '16px',
                                    backgroundColor: '#2196f3',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                    transition: 'all 0.3s'
                                }}
                                title="Spray for Virus disease"
                            >
                                🔵 Spray for Virus
                            </button>

                            <button
                                className="spray-btn btn-stop-spray"
                                onClick={() => sendSprayCommand(0, 'STOP')}
                                style={{
                                    padding: '20px',
                                    fontSize: '16px',
                                    backgroundColor: '#f44336',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                    transition: 'all 0.3s'
                                }}
                                title="Stop all spraying"
                            >
                                🛑 Stop Spraying
                            </button>
                        </div>

                        {lastSprayCommand && (
                            <div className="spray-status" style={{
                                marginTop: '20px',
                                padding: '15px',
                                backgroundColor: '#e8f5e9',
                                borderRadius: '8px',
                                border: '2px solid #4caf50'
                            }}>
                                <h3 style={{ margin: '0 0 10px 0', color: '#2e7d32' }}>Last Spray Command</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                    <span style={{ fontSize: '14px' }}>
                                        <strong>Command:</strong> {lastSprayCommand}
                                    </span>
                                    <span style={{ fontSize: '14px' }}>
                                        <strong>Time:</strong> {sprayCommandTime}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="control-info">
                        <div className="info-card">
                            <h4>📋 Movement Control Instructions</h4>
                            <ul>
                                <li><strong>Forward:</strong> Sends "F" - Robot moves forward</li>
                                <li><strong>Left:</strong> Sends "L" - Robot turns left</li>
                                <li><strong>Right:</strong> Sends "R" - Robot turns right</li>
                                <li><strong>Backward:</strong> Sends "B" - Robot moves backward</li>
                                <li><strong>Stop:</strong> Sets robot to idle state</li>
                            </ul>
                        </div>

                        <div className="info-card">
                            <h4>🌿 Spray Control Instructions</h4>
                            <ul>
                                <li><strong>Spray for Powdery:</strong> Sends value "1" - Activates powdery mildew treatment</li>
                                <li><strong>Spray for Rust:</strong> Sends value "2" - Activates rust disease treatment</li>
                                <li><strong>Spray for Virus:</strong> Sends value "3" - Activates virus disease treatment</li>
                                <li><strong>Stop Spraying:</strong> Sends value "0" - Stops all spray operations</li>
                            </ul>
                        </div>

                        <div className="info-card">
                            <h4>⚠️ Safety Notes</h4>
                            <ul>
                                <li>Commands are sent immediately when buttons are pressed</li>
                                <li>Use the Idle button to set robot to neutral state</li>
                                <li>Manual control overrides automatic route execution</li>
                                <li>Always stop spraying when not needed to conserve pesticides</li>
                                <li>Ensure proper pesticide is loaded before spraying</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ManualControl;