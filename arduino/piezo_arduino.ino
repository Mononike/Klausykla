
const int PIEZO_PIN = A0;
const int THRESHOLD = 10;

void setup() {
  Serial.begin(115200);
}

void loop() {
  int raw = analogRead(PIEZO_PIN);

  if (raw > THRESHOLD) {
    Serial.println(raw);
  } else {
    Serial.println(0);
  }

  delay(10);
}
