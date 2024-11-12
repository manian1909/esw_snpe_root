#include <WiFi.h>
#include <WebServer.h>
#include <HTTPClient.h>

// Motor Pins
#define PWM_PIN 4   // PWM pin
#define IN1_PIN 21  // Motor direction pin 1
#define IN2_PIN 18  // Motor direction pin 2

// Encoder Pins
#define ENCA 32
#define ENCB 34

// PID Constants
const float KP = 1.5;
const float KD = 0.02;
const float KI = 0.1;
const int MAX_SPEED = 255;
const int MAX_INTEGRAL = 50;

// Motor structure
struct Motor {
    byte speed = 0;
    struct {
        byte input1 = LOW;
        byte input2 = LOW;
    } direction;
};

// Global variables for encoder and PID control
volatile int position = 0;
long lastTime = 0;
float previousError = 0;
float integralError = 0;
Motor motorA;

// Encoder and motor constants
const int encoderPPR = 152;
const float gearRatio = 51.0;
const long effectivePPR = encoderPPR * gearRatio;

// Wi-Fi and ThingSpeak credentials
const char* ssid = "Esw";
const char* password = "manian19092006";
const char* api_key = "QW797Z0YCTEX3IWG";  // ThingSpeak API Key

// Target angle
int targetDegrees = 0;
int targetPosition = 0;

// Web server instance
WebServer server(80);

void setup() {
    Serial.begin(9600);
    pinMode(IN1_PIN, OUTPUT);
    pinMode(IN2_PIN, OUTPUT);
    pinMode(PWM_PIN, OUTPUT);
    pinMode(ENCA, INPUT);
    pinMode(ENCB, INPUT);
    
    attachInterrupt(digitalPinToInterrupt(ENCA), readEncoder, RISING);
    stopMotor();

    // Connect to Wi-Fi
    WiFi.begin(ssid, password);
    while (WiFi.status() != WL_CONNECTED) {
        delay(1000);
        Serial.println("Connecting to WiFi...");
    }
    Serial.println("Connected to WiFi");
    Serial.print("ESP32 IP Address: ");
    Serial.println(WiFi.localIP()); // Print ESP32 IP address

    // Configure web server routes
    server.on("/setAngle", HTTP_POST, handleSetAngle);  // Set angle route
    server.begin();
    Serial.println("HTTP server started");
}

void loop() {
    server.handleClient();  // Handle incoming HTTP requests

    if (targetPosition != position) {
        PIDControl(targetPosition);
    } else {
        stopMotor();
    }

    delay(100);
}

// Function to handle HTTP POST request to set the angle
void handleSetAngle() {
    if (server.hasArg("plain")) {
        String requestBody = server.arg("plain");
        targetDegrees = requestBody.toInt();
        targetPosition = targetDegrees * effectivePPR / 360;  // Convert degrees to encoder position
        server.send(200, "text/plain", "Angle set successfully");
    } else {
        server.send(400, "text/plain", "Invalid Request");
    }
}

// PID control function to reach the target position
void PIDControl(int target) {
    long currentTime = micros();
    float deltaTime = (currentTime - lastTime) / 1e6;
    lastTime = currentTime;

    int currentPosition;
    noInterrupts();
    currentPosition = position;
    interrupts();

    float error = target - currentPosition;
    integralError += error * deltaTime;
    integralError = constrain(integralError, -MAX_INTEGRAL, MAX_INTEGRAL);
    float derivativeError = (error - previousError) / deltaTime;

    float output = KP * error + KI * integralError + KD * derivativeError;
    output = constrain(output, -MAX_SPEED, MAX_SPEED);

    int direction = (output < 0) ? -1 : 1;
    setMotor(motorA, direction, abs(output));

    previousError = error;
}

void setMotor(Motor &m, int dir, int speed) {
    // Stop motor before reversing direction
    if ((dir == 1 && m.direction.input2 == HIGH) || (dir == -1 && m.direction.input1 == HIGH)) {
        stopMotor();
        delay(200);  // Allow motor to fully stop before reversing
    }

    // Gradual speed ramp-up
    int currentSpeed = m.speed;
    int step = (speed > currentSpeed) ? 1 : -1;
    while (currentSpeed != speed) {
        currentSpeed += step;
        setMotorSpeed(m, currentSpeed);
        delay(5);  // Adjust for smoother changes
    }

    if (dir == 1) {
        setMotorDirectionForward(m);
    } else if (dir == -1) {
        setMotorDirectionBackward(m);
    }
    sendToMotorA();
}

void stopMotor() {
    motorA.direction.input1 = LOW;
    motorA.direction.input2 = LOW;
    motorA.speed = 0;
    sendToMotorA();
}

void readEncoder() {
    position += (digitalRead(ENCB) == HIGH) ? 1 : -1;
}

void sendToMotorA() {
    sendToMotor(motorA, PWM_PIN, IN1_PIN, IN2_PIN);
}

void setMotorDirectionForward(Motor &m) {
    m.direction.input1 = HIGH;
    m.direction.input2 = LOW;
}

void setMotorDirectionBackward(Motor &m) {
    m.direction.input1 = LOW;
    m.direction.input2 = HIGH;
}

void sendToMotor(Motor &m, int pwmPin, int in1, int in2) {
    digitalWrite(in1, m.direction.input1);
    digitalWrite(in2, m.direction.input2);
    analogWrite(pwmPin, m.speed);
}

void setMotorSpeed(Motor &m, int speed) {
    m.speed = speed;
}

// Upload data to ThingSpeak
void uploadDataToThingSpeak(float speed, float angle, float voltage) {
    if (WiFi.status() == WL_CONNECTED) {
        HTTPClient http;
        String url = "https://api.thingspeak.com/update?api_key=" + String(api_key) +
                     "&field1=" + String(speed) +
                     "&field2=" + String(angle) +
                     "&field3=" + String(voltage);

        http.begin(url);
        int httpResponseCode = http.GET();
        if (httpResponseCode > 0) {
            Serial.println("Data uploaded successfully.");
        } else {
            Serial.println("Error uploading data: " + String(httpResponseCode));
        }
        http.end();
    } else {
        Serial.println("WiFi not connected.");
    }
}
