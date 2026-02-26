(
s.waitForBoot({

    // ========== 1. KIKI CLUSTER ==========
    SynthDef(\kikiCluster, {
        arg amp = 0.3, freq = 2200, dur = 0.8, piezo = 0.5;
        var sig, env, numPartials = 6;

        env = EnvGen.kr(
            Env.perc(0.001, dur, 1, -8),
            doneAction: 2
        );

        sig = Mix.fill(numPartials, { |i|
            var detune = LFNoise1.kr(Rand(3.0, 8.0)).range(-30, 30);
            var modFreq = freq * Rand(1.5, 4.0);
            var modIndex = piezo.linlin(0, 1, 1, 12);
            SinOsc.ar(
                freq + (i * 137) + detune + (SinOsc.ar(modFreq) * modIndex * freq),
                mul: 1 / numPartials
            );
        });

        sig = sig + (Hasher.ar(Phasor.ar(0, freq / SampleRate.ir)) * 0.08 * piezo);
        sig = HPF.ar(sig, 1800);
        sig = BPF.ar(sig, freq * piezo.linlin(0, 1, 0.8, 1.5), 0.4) + (sig * 0.3);
        sig = sig * env * amp;
        sig = Pan2.ar(sig, LFNoise1.kr(5).range(-0.6, 0.6));
        Out.ar(0, sig);
    }).add;

    // ========== 2. LOW HUM ==========
    SynthDef(\lowHum, {
        arg amp = 0.4, freq = 55, dur = 6.0, piezo = 0.5;
        var sig, env, vibrato, sub;

        env = EnvGen.kr(
            Env.new([0, 1, 0.7, 0], [dur * 0.15, dur * 0.6, dur * 0.25], [\sin, 0, \sin]),
            doneAction: 2
        );

        vibrato = SinOsc.kr(
            piezo.linlin(0, 1, 0.2, 1.8)
        ).range(freq * 0.98, freq * 1.02);

        sig = LFSaw.ar([vibrato, vibrato * 1.002], mul: 0.5);
        sig = LPF.ar(sig, freq * piezo.linlin(0, 1, 2, 6));

        sub = SinOsc.ar(freq * 0.5, mul: 0.4);
        sig = sig * (1 + (SinOsc.kr(0.3).range(0, 0.15)));
        sig = sig + sub;
        sig = sig * env * amp;
        Out.ar(0, sig);
    }).add;

    // ========== 3. BASS RUMBLE ==========
    SynthDef(\bassRumble, {
        arg amp = 0.5, freq = 32, dur = 8.0, piezo = 0.5;
        var sig, env, rumble, crackle;

        env = EnvGen.kr(
            Env.new([0, 1, 1, 0], [dur * 0.3, dur * 0.4, dur * 0.3], [\sin, 0, \sin]),
            doneAction: 2
        );

        rumble = Mix([
            SinOsc.ar(freq, mul: 0.5),
            SinOsc.ar(freq * 0.75, mul: 0.3),
            SinOsc.ar(freq * 1.5, mul: 0.15)
        ]);

        crackle = LFNoise0.ar(
            piezo.linlin(0, 1, 4, 40)
        ) * 0.2;
        crackle = LPF.ar(crackle, 80);

        rumble = rumble * (1 + LFNoise2.kr(0.5).range(-0.1, 0.1));
        sig = rumble + crackle;
        sig = LPF.ar(sig, piezo.linlin(0, 1, 50, 120));
        sig = Compander.ar(sig, sig, 0.3, 1, 0.5, 0.01, 0.1);
        sig = sig * env * amp;
        sig = Pan2.ar(sig, 0);
        Out.ar(0, sig);
    }).add;

    // ========== 4. MODULATION & REVERB ==========
    SynthDef(\modulationReverb, {
        arg amp = 0.3, freq = 440, dur = 10.0, piezo = 0.5;
        var sig, env, wet;

        env = EnvGen.kr(
            Env.new([0, 0.7, 1, 0.6, 0], [dur*0.2, dur*0.2, dur*0.3, dur*0.3], \sin),
            doneAction: 2
        );

        sig = SinOsc.ar(freq) + SinOsc.ar(freq * 1.001);

        sig = sig + CombL.ar(
            sig, 0.05,
            SinOsc.kr(piezo.linlin(0, 1, 0.1, 2.0)).range(0.005, 0.025),
            1.0
        ) * 0.5;

        sig = sig + CombC.ar(
            sig, 0.01,
            SinOsc.kr(0.15).range(0.001, 0.008),
            0.5
        ) * 0.3;

        sig = PitchShift.ar(sig, 0.2, LFNoise2.kr(0.1).range(0.98, 1.02));

        wet = sig;
        4.do({ |i|
            wet = AllpassC.ar(wet, 0.08, Rand(0.01, 0.08),
                piezo.linlin(0, 1, 2.0, 8.0)
            );
        });
        sig = (sig * 0.3) + (wet * 0.7);
        sig = LPF.ar(sig, piezo.linlin(0, 1, 800, 4000));
        sig = sig * env * amp;
        sig = Pan2.ar(sig, SinOsc.kr(0.07).range(-0.8, 0.8));
        Out.ar(0, sig);
    }).add;

    // ========== 5. FRAGMENTED GLITCH CLICKS ==========
    SynthDef(\glitchClicks, {
        arg amp = 0.4, freq = 800, dur = 4.0, piezo = 0.5;
        var sig, env, trig, click, burst;

        env = EnvGen.kr(
            Env.new([0, 1, 1, 0], [0.01, dur - 0.02, 0.01]),
            doneAction: 2
        );

        trig = Impulse.kr(
            piezo.linlin(0, 1, 4, 25) + LFNoise0.kr(7).range(-3, 3)
        );
        trig = trig * (TIRand.kr(0, 3, trig) > 0);

        click = EnvGen.ar(
            Env.perc(0.0005, 0.003), trig
        ) * SinOsc.ar(TIRand.kr(2000, 12000, trig));

        burst = EnvGen.ar(
            Env.perc(0.001, TIRand.kr(0.005, 0.04, trig)),
            trig * (TIRand.kr(0, 4, trig) < 1)
        ) * WhiteNoise.ar(0.3);

        sig = click + burst;
        sig = Latch.ar(sig, Impulse.ar(piezo.linlin(0, 1, 8000, 44100)));
        sig = HPF.ar(sig, 600);
        sig = sig * env * amp;
        sig = Pan2.ar(sig, TIRand.kr(-0.7, 0.7, trig));
        Out.ar(0, sig);
    }).add;

    // ========== GARSO PALEIDIMO FUNKCIJA ==========
    ~piezoSim = 0.5;

    ~triggerSound = { |soundIndex|
        var p = ~piezoSim;

        case
        { soundIndex == 0 } {
            Synth(\kikiCluster, [
                \amp, p.linlin(0, 1, 0.15, 0.4),
                \freq, p.linlin(0, 1, 1800, 4000),
                \dur, p.linlin(0, 1, 0.4, 1.5),
                \piezo, p
            ]);
            (">> Kiki Cluster | piezo: " ++ p.round(0.01)).postln;
        }
        { soundIndex == 1 } {
            Synth(\lowHum, [
                \amp, p.linlin(0, 1, 0.2, 0.45),
                \freq, p.linlin(0, 1, 40, 80),
                \dur, 6.0,
                \piezo, p
            ]);
            (">> Low Hum | piezo: " ++ p.round(0.01)).postln;
        }
        { soundIndex == 2 } {
            Synth(\bassRumble, [
                \amp, p.linlin(0, 1, 0.25, 0.5),
                \freq, p.linlin(0, 1, 25, 50),
                \dur, 8.0,
                \piezo, p
            ]);
            (">> Bass Rumble | piezo: " ++ p.round(0.01)).postln;
        }
        { soundIndex == 3 } {
            Synth(\modulationReverb, [
                \amp, 0.3,
                \freq, p.linlin(0, 1, 200, 700),
                \dur, 10.0,
                \piezo, p
            ]);
            (">> Modulation Reverb | piezo: " ++ p.round(0.01)).postln;
        }
        { soundIndex == 4 } {
            Synth(\glitchClicks, [
                \amp, p.linlin(0, 1, 0.25, 0.5),
                \freq, 800,
                \dur, 4.0,
                \piezo, p
            ]);
            (">> Glitch Clicks | piezo: " ++ p.round(0.01)).postln;
        };
    };

    // ========== GUI LANGAS ==========
    {
        var win, slider, label;

        win = Window("Laipciaus Klausykla", Rect(200, 200, 420, 380))
            .background_(Color(0.12, 0.12, 0.14));

        StaticText(win, Rect(20, 15, 380, 30))
            .string_("LAIPCIAUS KLAUSYKLA")
            .font_(Font("Helvetica", 20, true))
            .stringColor_(Color.white)
            .align_(\center);

        StaticText(win, Rect(20, 60, 380, 20))
            .string_("Piezo simuliacija (prisilietimo jega)")
            .font_(Font("Helvetica", 12))
            .stringColor_(Color(0.7, 0.7, 0.7))
            .align_(\center);

        slider = Slider(win, Rect(20, 85, 380, 30))
            .value_(0.5)
            .background_(Color(0.2, 0.2, 0.22))
            .knobColor_(Color(0.8, 0.8, 0.85))
            .action_({ |sl|
                ~piezoSim = sl.value;
                label.string_("piezo: " ++ ~piezoSim.round(0.01));
            });

        label = StaticText(win, Rect(20, 118, 380, 20))
            .string_("piezo: 0.5")
            .font_(Font("Mono", 13))
            .stringColor_(Color(0.6, 0.9, 0.6))
            .align_(\center);

        [
            ["1  Kiki Cluster",       Color(0.9, 0.3, 0.3)],
            ["2  Low Hum",            Color(0.3, 0.5, 0.9)],
            ["3  Bass Rumble",        Color(0.4, 0.3, 0.6)],
            ["4  Modulation Reverb",  Color(0.3, 0.8, 0.7)],
            ["5  Glitch Clicks",      Color(0.9, 0.7, 0.2)]
        ].do({ |item, i|
            Button(win, Rect(20, 155 + (i * 40), 380, 34))
                .states_([
                    [item[0], Color.white, item[1].alpha_(0.75)]
                ])
                .font_(Font("Helvetica", 13, true))
                .action_({
                    ~triggerSound.(i);
                });
        });

        StaticText(win, Rect(20, 360, 380, 16))
            .string_("Klaviatura: 1-5 paleidzia garsus | Slankiklis = piezo jega")
            .font_(Font("Helvetica", 10))
            .stringColor_(Color(0.5, 0.5, 0.5))
            .align_(\center);

        win.view.keyDownAction_({ |view, char|
            case
            { char == $1 } { ~triggerSound.(0) }
            { char == $2 } { ~triggerSound.(1) }
            { char == $3 } { ~triggerSound.(2) }
            { char == $4 } { ~triggerSound.(3) }
            { char == $5 } { ~triggerSound.(4) };
        });

        win.front;
        "Paruosta! Spausk 1-5 arba naudok mygtukus.".postln;

    }.defer;

});
)
