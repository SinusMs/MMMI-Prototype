// audioManager.ts

import * as Tone from 'tone';

let loopPlayers: Tone.Player[] = [];
let samplePlayers: Tone.Player[] = [];
let isLoaded = false;

// --- EFFEKTE SETUP ---

// Reverb & Delay
// Initial stumm (wet = 0)
const reverb = new Tone.Reverb({ decay: 3, wet: 0 }).toDestination();
const delay = new Tone.FeedbackDelay({ delayTime: "8n", feedback: 0.5, wet: 0 }).toDestination();

// DJ-Filter Setup
// WICHTIG: Rolloff -12 ist sanfter und verhindert Verzerrungen besser als der Standard.
// Initialzustand: Neutral (Lowpass ganz offen 20kHz, Highpass ganz unten 10Hz - NICHT 0Hz!)
const lowpass = new Tone.Filter({
    frequency: 20000, 
    type: "lowpass", 
    rolloff: -12,
    Q: 1 // Q gering halten um Resonanz-Verzerrung zu vermeiden
}).toDestination();

const highpass = new Tone.Filter({
    frequency: 10, // 10Hz statt 0Hz verhindert den Audio-Ausfall!
    type: "highpass", 
    rolloff: -12,
    Q: 1
}).connect(lowpass);

// Master Bus für Loops
const masterBus = new Tone.Gain(1).connect(highpass);

// Delay und Reverb parallel vom Filter-Ausgang abgreifen
lowpass.connect(delay);
lowpass.connect(reverb);

export let loopVolumes: Tone.Volume[] = [];

export async function initAudio() {
    if (isLoaded) return;

    console.log("Initialisiere Audio...");
    await Tone.start();
    
    // Reset bei Init
    reverb.wet.value = 0;
    delay.wet.value = 0;
    lowpass.frequency.value = 20000;
    highpass.frequency.value = 10; // Sicherer Wert

    const loopPaths = [
        "audio/track1.wav",
        "audio/track2.wav",
        "audio/track3.wav",
        "audio/track4.wav"
    ];

    const samplePaths = [
        "audio/sample1.wav",
        "audio/sample2.wav",
        "audio/sample3.wav",
        "audio/sample4.wav",
        "audio/sample5.wav"
    ];

    // Loops laden
    for (let i = 0; i < loopPaths.length; i++) {
        // Start: -Infinity (Stumm)
        const vol = new Tone.Volume(-Infinity).connect(masterBus);
        loopVolumes.push(vol);

        const player = new Tone.Player({
            url: loopPaths[i],
            loop: true,
            autostart: false
        }).connect(vol);
        
        player.sync().start(0);
        loopPlayers.push(player);
    }

    // Samples laden
    for (let i = 0; i < samplePaths.length; i++) {
        const player = new Tone.Player({
            url: samplePaths[i],
            loop: false,
            autostart: false
        }).toDestination();
        samplePlayers.push(player);
    }

    await Tone.loaded();
    isLoaded = true;
    console.log("Audio-Engine bereit!");
}

export function startLoop() {
    if (!isLoaded) return;
    if (Tone.Transport.state !== "started") {
        Tone.Transport.start();
    }
}

export function stopLoop() {
    if (Tone.Transport.state === "started") {
        Tone.Transport.stop();
    }
}

export function setLoopVolume(index: number, value01: number) {
    if (loopVolumes[index]) {
        // Mapping: 1.0 = -10dB (Maximal), 0.0 = Stumm
        if (value01 <= 0.001) {
            loopVolumes[index].volume.rampTo(-Infinity, 0.1);
        } else {
            // Logarithmische Skala, max -10dB
            const db = (20 * Math.log10(value01)) - 10;
            loopVolumes[index].volume.rampTo(db, 0.1);
        }
    }
}

export function triggerSample(index: number) {
    if (samplePlayers[index] && samplePlayers[index].loaded) {
        samplePlayers[index].stop();
        samplePlayers[index].start();
        console.log(`Sample ${index + 1} getriggert`);
    }
}

export function setEffectValue(type: 'reverb' | 'delay' | 'filter', value01: number) {
    // Safety clamp
    const val = Math.max(0, Math.min(1, value01));

    if (type === 'reverb') {
        reverb.wet.rampTo(val, 0.1);
    } else if (type === 'delay') {
        delay.wet.rampTo(val, 0.1);
    } else if (type === 'filter') {
        // DJ Filter Logik
        // 0.5 = Neutral (Zeiger Norden)
        
        if (val < 0.5) {
            // --- LOWPASS MODUS (Links) ---
            // Mapping: 0.5 -> 20000Hz, 0.0 -> 100Hz
            // Wir normalisieren den linken Bereich (0.0 bis 0.5) auf (0.0 bis 1.0)
            const norm = val * 2; 
            
            // Logarithmisches Mapping für sanften Übergang ohne Verzerrung
            // Formel: min * (max/min)^norm
            const freq = 100 * Math.pow(20000 / 100, norm);
            
            lowpass.frequency.rampTo(freq, 0.1);
            highpass.frequency.rampTo(10, 0.1); // HP bleibt unten (neutral)
            
        } else {
            // --- HIGHPASS MODUS (Rechts) ---
            // Mapping: 0.5 -> 10Hz, 1.0 -> 10000Hz
            // Wir normalisieren den rechten Bereich (0.5 bis 1.0) auf (0.0 bis 1.0)
            const norm = (val - 0.5) * 2;
            
            const freq = 10 * Math.pow(10000 / 10, norm);

            highpass.frequency.rampTo(freq, 0.1);
            lowpass.frequency.rampTo(20000, 0.1); // LP bleibt oben (neutral)
        }
    }
}