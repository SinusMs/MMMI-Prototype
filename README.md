# MMMI-Prototype

## Entwicklungsumgebung
### Voraussetzungen
- **Node.js v24.11.1** und npm erforderlich
- [Installation Guide](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)

### Setup
Abhängigkeiten installieren:
   ```bash
   npm install
   ```

Lokalen Entwicklungsserver starten: 
   ```bash
   npx vite
   ```

## Über die Anwendung

**MMMI-Prototype** ist eine interaktive Musik-Anwendung, die es Benutzern ermöglicht, Musik mittels **Handgesten** zu steuern und zu manipulieren. Die Anwendung verwendet die Webcam, um Hand- und Fingerbewegungen zu erkennen, und wandelt diese in Musiksteuerbefehle um.

### Funktionen:
- **Gestenerkennung**: Erkennt Handpositionen in Echtzeit
- **Musikmanipulation**: Steuern Sie Musikspuren, Effekte und Parameter durch intuitive Handbewegungen
- **Visuelles Feedback**: p5.js-basierte Visualisierung mit Partikeleffekten
- **Soundsystem**: Tone.js für Audio-Manipulation
- **Interaktive UI**: Bedienelemente können durch Greifen und Ziehen mit der Hand gesteuert werden

---

## Ausführung der Anwendung

### Voraussetzungen:
- Ein **Chromium-basierter Browser** (Chrome, Edge, Brave, etc.)
- Eine **funktionierende Webcam**
- **Gute Beleuchtung** für optimale Gestenerkennung
- **Systemlautstärke aktiviert**

### Webcam-Zugriff genehmigen
Wenn die Anwendung zum ersten Mal geöffnet wird, wird man aufgefordert, der Anwendung Zugriff auf die Webcam zu gewähren. Dies muss bestätigt werden.

---

## Bedienung der Anwendung

### Willkommensbildschirm
Nach dem Start erscheint ein Willkommensbildschirm mit Anleitungen und Anforderungen. Die Anwendung dann mit dem **Start-Button** starten.

### Gestenerkennung
- Hände und Finger werden als Punkte auf dem Bildschirm angezeigt
- Hände bewegen, um die Bedienelemente zu steuern
- **Eine Faust machen**, um UI-Elemente zu greifen und zu ziehen/drehen/bewegen

### Tastenkombinationen:
| Taste | Funktion |
|-------|----------|
| **Enter** | Audio-Einstellungen zurücksetzen |
| **F** | Vollbildmodus an/aus |
| **Strg + Mausrad** | Fenster vergrößern/verkleinern |
| **F5** | Seite neu laden (hilft bei Erkennungsproblemen) |

### Known Issues:
- **Hände werden nicht erkannt?** Sicherstellen, dass die Beleuchtung ausreichend ist und/oder die Seite neu laden (F5).
- **Nur Kamerabild sichtbar?** Einen Moment warten, bis die Gestenerkennung geladen hat, oder Seite neu laden.

____________________________________________________________________

### **Der MMMI-Prototype:** [Experience starten!](https://sinusms.github.io/MMMI-Prototype/)

____________________________________________________________________

## AMITUDE-Beschreibung

**(A):** Eine musikalische Freizeit-Anwendung **(T):** zur intuitiven LiveManipulation von Musikspuren und Effekten eines Songs **(E):** im häuslichen
Freizeitumfeld, **(U):** indem der Nutzer **(M):** mittels Handgesten
(Greifbewegungen im Raum) virtuelle Instrumente und Effektregler steuert,
**(D):** die über eine Webcam erfasst werden, **(M):** und haptisch über **(D):**
Tastatureingaben **(T):** globale Systemzustände (Reset/Panic) kontrolliert.

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
