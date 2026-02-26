// ============================================================
// PIEZO INTEGRACIJA — paleisk PO 01_synthdefs.scd
// ============================================================
//
// PIRMA: patikrink savo porto pavadinima:
//   SerialPort.listDevices;
//
// Tipiniai pavadinimai:
//   Mac:     "/dev/tty.usbmodem14101"  (arba panasus)
//   Linux:   "/dev/ttyACM0"
//   Windows: "COM3"
//
// SVARBU: Arduino IDE Serial Monitor turi buti UZDARYTAS.
// Tik viena programa gali skaityti porta.
// ============================================================

// 0 ZINGSNIS: patikrini porta
SerialPort.listDevices;

// 1 ZINGSNIS: paleisk si bloka (pakeisk porto pavadinima)
(
var port, lastTrigTime = 0, cooldown = 0.3;

// --- PAKEISK CIA savo porto pavadinima ---
port = SerialPort("/dev/ttyACM0", baudrate: 115200, crtscts: false);

~serialBuffer = "";
~port = port; // issaugom kad galetum uzdaryti veliau

~serialRoutine = Routine({
    inf.do({
        var byte, char, piezoRaw, piezoNorm;

        byte = port.read;

        if(byte.notNil, {
            char = byte.asAscii;

            if(char == $\n, {
                piezoRaw = ~serialBuffer.stripWhiteSpace.asInteger;
                ~serialBuffer = "";

                if(piezoRaw.notNil and: { piezoRaw > 0 }, {
                    piezoNorm = piezoRaw.linlin(0, 1023, 0.0, 1.0);

                    // Slenkstis — ignoruoti triuksma
                    if(piezoNorm > 0.05, {
                        var now = Main.elapsedTime;

                        if((now - lastTrigTime) > cooldown, {
                            lastTrigTime = now;

                            // Piezo intensyvumas → garso tipas
                            case
                            { piezoNorm < 0.15 } {
                                Synth(\lowHum, [
                                    \amp, piezoNorm.linlin(0.05, 0.15, 0.2, 0.4),
                                    \freq, piezoNorm.linlin(0.05, 0.15, 45, 70),
                                    \dur, 6.0,
                                    \piezo, piezoNorm
                                ]);
                                (">> Low Hum | " ++ piezoNorm.round(0.01)).postln;
                            }
                            { piezoNorm < 0.35 } {
                                Synth(\bassRumble, [
                                    \amp, piezoNorm.linlin(0.15, 0.35, 0.3, 0.5),
                                    \freq, piezoNorm.linlin(0.15, 0.35, 28, 45),
                                    \dur, 8.0,
                                    \piezo, piezoNorm
                                ]);
                                (">> Bass Rumble | " ++ piezoNorm.round(0.01)).postln;
                            }
                            { piezoNorm < 0.55 } {
                                Synth(\modulationReverb, [
                                    \amp, 0.3,
                                    \freq, piezoNorm.linlin(0.35, 0.55, 220, 660),
                                    \dur, 10.0,
                                    \piezo, piezoNorm
                                ]);
                                (">> Modulation Reverb | " ++ piezoNorm.round(0.01)).postln;
                            }
                            { piezoNorm < 0.75 } {
                                Synth(\glitchClicks, [
                                    \amp, piezoNorm.linlin(0.55, 0.75, 0.3, 0.5),
                                    \freq, 800,
                                    \dur, 4.0,
                                    \piezo, piezoNorm
                                ]);
                                (">> Glitch Clicks | " ++ piezoNorm.round(0.01)).postln;
                            }
                            { // piezoNorm >= 0.75
                                Synth(\kikiCluster, [
                                    \amp, piezoNorm.linlin(0.75, 1.0, 0.2, 0.4),
                                    \freq, piezoNorm.linlin(0.75, 1.0, 1800, 4000),
                                    \dur, piezoNorm.linlin(0.75, 1.0, 0.5, 1.5),
                                    \piezo, piezoNorm
                                ]);
                                (">> Kiki Cluster | " ++ piezoNorm.round(0.01)).postln;
                            };
                        });
                    });
                });
            }, {
                ~serialBuffer = ~serialBuffer ++ char;
            });
        });
    });
}).play;

"Piezo klausosi... Liesk jutikli!".postln;
)


// 2 ZINGSNIS: kai nori sustabdyti — paleisk si bloka
(
~serialRoutine.stop;
~port.close;
"Sustabdyta.".postln;
)
