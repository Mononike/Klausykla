// ============================================================
// LAIPCIAUS KLAUSYKLA — Arduino Piezo
// ============================================================
//
// JUNGTYS:
//
//    Arduino A0 ---+--- Piezo (+)
//                  |
//               [1M ohm]
//                  |
//    Arduino GND --+--- Piezo (-)
//
// Rezistorius 1M ohm jungiamas LYGIAGREČIAI su piezo.
// Jei neturi 1M, tinka ir 470K arba 2.2M.
//
// ============================================================

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
