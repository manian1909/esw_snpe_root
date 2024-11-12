#include <WiFi.h>
#include <HTTPClient.h>

// Motor Pins
#define PWM_PIN 4   // PWM pin
#define IN1_PIN 21  // Motor direction pin 1
#define IN2_PIN 18  // Motor direction pin 2

// Encoder Pins
#define ENCA 32
#define ENCB 34

// PID Constants
const float KP = 1.5;  // Reduce proportional term
const float KD = 0.02;  // Reduce derivative term
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

// Create a motor instance
Motor motorA;

const int encoderPPR = 152;  
const float gearRatio = 51.0;  
const long effectivePPR = encoderPPR * gearRatio;  

// WiFi and ThingSpeak credentials
const char* ssid = "Esw";
const char* password = "manian19092006";
const char* api_key = "QW797Z0YCTEX3IWG";

// URL to fetch angle from your website
const char* angle_url = "https://manian1909.github.io/esw_snpe_root/angle";  // Adjust if necessary

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
}

void loop() {
    // Fetch angle from website
    int angle = fetchAngleFromWeb();
    int target = 0;

    if (angle != 0) {
        target = angle * (effectivePPR) / 360.0;
        while (true) {
            PIDControl(target);
            delay(100);
            if (abs(position - target) < 10) {
                stopMotor();
                break;
            }
        }
    } else {
        stopMotor(); 
    }

    target = (target * 360.0) / effectivePPR;
    position = (position * 360.0) / effectivePPR;
    Serial.print("Angle: "); Serial.print(angle);
    Serial.print(" Target: "); Serial.print(target);
    Serial.print(" Position: "); Serial.println(position);
    uploadDataToThingSpeak(angle, target, position);
    delay(15000);  // 15 seconds delay between updates
}

// Function to fetch angle from website
int fetchAngleFromWeb() {
    if (WiFi.status() == WL_CONNECTED) {
        HTTPClient http;
        http.begin(angle_url);  // Specify the URL
        int httpResponseCode = http.GET();
        
        if (httpResponseCode > 0) {
            String payload = http.getString();
            Serial.println("Fetched Angle: " + payload);
            http.end();
            return payload.toInt();  // Convert the payload to integer
        } else {
            Serial.println("Error fetching angle: " + String(httpResponseCode));
        }
        http.end();
    } else {
        Serial.println("WiFi not connected.");
    }
    return 0;  // Default to 0 if fetch fails
}

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

    Serial.print("Target: ");
    Serial.print((target * 360.0) / effectivePPR);
    Serial.print(" Current Position: ");
    Serial.println((currentPosition * 360.0) / effectivePPR);
}

void setMotor(Motor &m, int dir, int speed) {
    // Stop the motor briefly before reversing direction
    if ((dir == 1 && m.direction.input2 == HIGH) || 
        (dir == -1 && m.direction.input1 == HIGH)) {
        stopMotor();
        delay(200);  // Delay to allow motor to fully stop before reversing
    }

    // Gradual ramp-up to avoid jerks
    int currentSpeed = m.speed;
    int step = (speed > currentSpeed) ? 1 : -1;
    while (currentSpeed != speed) {
        currentSpeed += step;
        setMotorSpeed(m, currentSpeed);
        delay(5);  // Adjust delay for smoother speed changes
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

// Function to upload speed, angle, and voltage to ThingSpeak
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
