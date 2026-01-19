# MMMI-Prototype

## Über die Anwendung

**MMMI-Prototype** ist eine interaktive Musik-Anwendung, die es Benutzern ermöglicht, Musik mittels **Handgesten** zu steuern und zu manipulieren. Die Anwendung verwendet Ihre Webcam, um Hand- und Fingerbewegungen zu erkennen, und wandelt diese in Musiksteuerbefehle um.

### Funktionen:
- **Gestenerkennung**: Erkennt Hand- und Fingerpositionen in Echtzeit
- **Musikmanipulation**: Steuern Sie Musikspuren, Effekte und Parameter durch intuitive Handbewegungen
- **Visuelles Feedback**: p5.js-basierte Visualisierung mit Partikeleffekten
- **Soundsynthese**: Tone.js für Audio-Erzeugung und -Manipulation
- **Interaktive UI**: Bedienelemente können durch Greifen und Ziehen mit der Hand gesteuert werden

---

## Ausführung

### Voraussetzungen:
- Ein **Chromium-basierter Browser** (Chrome, Edge, Brave, etc.)
- Eine **funktionierende Webcam**
- **Gute Beleuchtung** für optimale Gestenerkennung
- **Systemlautstärke aktiviert**

 Öffne diese URL in deinem Browser. (https://sinusms.github.io/MMMI-Prototype/).

### Schritt 3: Webcam-Zugriff genehmigen
Wenn du die Anwendung zum ersten Mal öffnest, wirst du aufgefordert, der Anwendung Zugriff auf deine Webcam zu gewähren. Akzeptiere diese Berechtigung.

---

## Verwendung der Anwendung

### Willkommensbildschirm
Nach dem Start sieht du einen Willkommensbildschirm mit Anleitungen und Anforderungen. Bestätige mit dem **Start-Button**.

### Gestenerkennung
- Deine Hände und Finger werden als Punkte auf dem Bildschirm angezeigt
- Bewege deine Hände, um die Bedienelemente zu steuern
- **Mache eine Faust**, um UI-Elemente zu greifen und zu ziehen

### Tastenkombinationen:
| Taste | Funktion |
|-------|----------|
| **Enter** | Audio-Einstellungen zurücksetzen |
| **F** | Vollbildmodus an/aus |
| **Strg + Mausrad** | Fenster vergrößern/verkleinern |
| **F5** | Seite neu laden (hilft bei Erkennungsproblemen) |

### Häufige Probleme:
- **Hände werden nicht erkannt?** Stelle sicher, dass du gut beleuchtet bist und versuche, die Seite neu zu laden (F5).
- **Nur Kamerabild sichtbar?** Warte einen Moment, bis die Gestenerkennung geladen hat, oder lade neu.

____________________________________________________________________

## AMITUDE-Beschreibung

**(A)**: Eine musikalische Freizeit-Anwendung **(T)**: zur intuitiven LiveManipulation von Musikspuren und Effekten eines Songs **(E)**: im häuslichen
Freizeitumfeld, **(U)**: indem der Nutzer **(M)**: mittels Handgesten
(Greifbewegungen im Raum) virtuelle Instrumente und Effektregler steuert,
**(D)**: die über eine Webcam erfasst werden, **(M)**: und haptisch über **(D)**
Tastatureingaben **(T)**: globale Systemzustände (Reset/Panic) kontrolliert.

## CROW-Framework
### Character

<table style="width: 100%;">
<tr>
<td style="width: 100px; vertical-align: top;"><strong>Wer?</strong></td>
<td style="width: 600px; vertical-align: top;">Alex, ein Musikliebhaber, der nach der Arbeit abschalten will.</td>
</tr>
<tr>
<td style="width: 100px; vertical-align: top;"><strong>Attribute:</strong></td>
<td style="width: 600px; vertical-align: top;">Kreativ, aber kein Profi-Musiker (DAWs sind ihm zu komplex). Probiert gerne aus, eher pragmatisch.</td>
</tr>
<tr>
<td style="width: 100px; vertical-align: top;"><strong>Haltung:</strong></td>
<td style="width: 600px; vertical-align: top;">Sucht intuitiven Spaß ("Instant Gratification") statt technischer Perfektion. Möchte sich zB nach der Arbeit oder als Pausenaktivität zwischen Anstrengungen zur Entspannung kreativ ausleben.</td>
</tr>
<tr>
<td style="width: 100px; vertical-align: top;"><strong>Entscheidung:</strong></td>
<td style="width: 600px; vertical-align: top;">Will Musik selber gestalten, spielen und nicht nur konsumieren aber oft auch nicht selber erstellen/planen.</td>
</tr>
</table>

## CROW-Framework
### Relationship

<table style="width: 100%;">
<tr>
<td style="width: 100px; vertical-align: top;"><strong>Human to Device:</strong></td>
<td style="width: 600px; vertical-align: top;">Alex möchte keine "Arbeitsbeziehung" (Maus/Tastatur) zum Gerät, sondern eine spielerische Interaktion. Alex arbeitet oft am Computer und möchte eine Abgrenzung im Prototype-Kontext, der die Atmosphäre des Arbeitsplatzes "eigener PC" auflöst. Das System soll eher wie ein Instrument wirken, nicht wie ein Computer.</td>
</tr>
</table>


## CROW-Framework
### Objective

<table style="width: 100%;">
<tr>
<td style="width: 100px; vertical-align: top;"><strong>Ziel:</strong></td>
<td style="width: 600px; vertical-align: top;">Die Anwendung hilft ihm, gegen einen möglichen kreativen Burnout zu arbeiten und hält sein Interesse und seine Verbindung zu seiner Kreativität hoch.</td>
</tr>
<tr>
<td style="width: 100px; vertical-align: top;"><strong>Meta-Ziel:</strong></td>
<td style="width: 600px; vertical-align: top;">Alex möchte aktiv kreativ sein. Er will ein Erfolgserlebnis ,ohne zB Musiktheorie lernen zu müssen. Das Ziel bei Verwendung der Anwendung ist Entspannung und kreativer Ausdruck.</td>
</tr>
</table>

## CROW-Framework
### Where


<table style="width: 100%;">
<tr>
<td style="width: 100px; vertical-align: top;"><strong>Umgebung:</strong></td>
<td style="width: 600px; vertical-align: top;">Zuhause im Wohnzimmer oder am Schreibtisch, im gewohnten privaten Umfeld. Ausgabe zB über Kopfhörer und damit nicht unmittelbar störend für Menschen im direkten Umfeld. Durch Kameras und starken Akkus in fast allen Endgeräten auch portabel, Alex kann sich das gewünschte Umfeld "überall" erstellen.
.</td>
</tr>
</table>

## Storyboard
![Beschreibung](./public/images/Storyboard_MMMIPrototype.png)

## legacy
- Install npm + Node.js **v24.11.1** (Installation Guide: https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)
 - run `npm install` from the project directory to install all dependencies
 - run `npx vite` to run a local dev server