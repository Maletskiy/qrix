import type { LandingBundle } from "../types";

const chrome = {
  htmlLang: "de",
  langName: "Deutsch",
  tagline: "Kein Quadrat. Nur ein Code.",
  openApp: "Generator öffnen",
  demoTitle: "Was in diesem Code steckt",
  faqTitle: "Kurz das Wichtigste",
  guidesTitle: "Weitere Anleitungen",
  footerNote: "Die Codes entstehen vollständig im Browser — Adressen, Passwörter und Beträge werden nirgendwohin gesendet.",
  breadcrumbHome: "QR-Code-Generator",
  langSwitchLabel: "Sprache der Seite",
  footerAuthor: "Qrix — QR-Code-Generator",
};

const pages = [
  {
    slug: "wlan-qr-code",
    title: "WLAN-QR-Code: Gäste verbinden sich selbst",
    description:
      "WLAN-QR-Code für Gäste: Format WIFI:, Maskierung der Sonderzeichen, verborgenes Netz und die Fehler, bei denen die Kamera keine Verbindung anbietet.",
    h1: "WLAN-QR-Code: Gäste verbinden sich ohne Passwort auf dem Zettel",
    lede: "Man hält die Handykamera darauf, und das System schlägt die Verbindung zum Netz von selbst vor. Niemand diktiert das Passwort, klebt es auf einen Aufkleber oder fragt Buchstabe für Buchstabe nach.",
    demo: {
      value: "WIFI:T:WPA;S:Coffee Lab;P:espresso2026;;",
      label: "Verschlüsselungstyp, Netzname und Passwort — alles im Code",
    },
    sections: [
      {
        heading: "So funktioniert es",
        paragraphs: [
          "Im QR-Code steht eine Zeichenkette im Format WIFI:. Sie hat vier Felder: Verschlüsselungstyp (T), Netzname (S), Passwort (P) und das Kennzeichen für ein verborgenes Netz (H). Das Telefon liest sie aus und trägt die Werte in den Verbindungsdialog des Systems ein — eine App und eine Internetverbindung sind dafür nicht nötig, alle Angaben stecken bereits im Bild.",
          "Deshalb funktioniert so ein Code dauerhaft: Er verweist nicht auf eine Website, hängt von keinem Hosting ab und öffnet sich auch nach einem Anbieterwechsel weiter. Kaputtgehen kann er nur physisch — durch Sonne, Wasser oder einen zu kleinen Druck.",
        ],
      },
      {
        heading: "Zeichen, die den Code zerstören",
        paragraphs: [
          "Im Format WIFI: gelten Semikolon, Doppelpunkt, Komma, Backslash und doppeltes Anführungszeichen als Trennzeichen. Enthält das Passwort eines davon, muss das Zeichen mit einem Backslash maskiert werden — sonst schneidet das Telefon das Passwort am Trennzeichen ab und die Verbindung scheitert.",
          "In Qrix läuft die Maskierung automatisch nach Standard: Ein Passwort wie `coffee;2026` zerlegt den Code nicht in zwei Teile. Dasselbe gilt für Kyrillisch im Netznamen — es wird in UTF-8 kodiert und von Telefonen problemlos gelesen.",
        ],
      },
      {
        heading: "Wo er hingehört",
        paragraphs: [
          "Empfangstheke, Tisch im Café, Besprechungsraum, Gäste-WLAN in der Wohnung für Freunde, Wartebereich im Salon. Der Code hängt am besten neben der Steckdose oder an einer gut sichtbaren Stelle am Eingang — dort, wo das Telefon schon in der Hand ist.",
          "Für Druck nehmen Sie SVG: Es wird beim Vergrößern nicht unscharf und lässt sich in jeder Größe drucken. Für Bildschirm oder Messenger reicht PNG. Die kleinste Seitenlänge liegt beim Druck bei etwa 2 Zentimetern, sonst erfasst die Kamera die Module nicht mehr.",
        ],
      },
      {
        heading: "Was man wissen sollte",
        paragraphs: [
          "Ein QR-Code verschlüsselt das Passwort nicht: Wer ihn sieht, kommt ins Netz. Hängen Sie deshalb keinen Code für das Hauptnetz auf — legen Sie ein eigenes Gast-SSID an, dessen Passwort sich mit einem Handgriff ändern lässt, ohne die Arbeitsgeräte neu einzurichten.",
          "Und geben Sie dem Gastnetz keinen Zugriff auf lokale Ressourcen: Drucker, NAS, Kameras. Der QR-Code löst die Aufgabe „schnell verbinden“, nicht die Aufgabe „sicher verbinden“.",
        ],
      },
    ],
    faq: [
      {
        q: "Braucht man Internet, um sich über den Code zu verbinden?",
        a: "Nein. Die Netzdaten liegen im Code selbst, das Telefon muss nichts nachladen. Internet gibt es erst nach der Verbindung.",
      },
      {
        q: "Was ist, wenn das Passwort geändert werden muss?",
        a: "Ein statischer Code muss neu gedruckt werden. Deshalb legt man das Gastnetz getrennt an: Ein neues Passwort dafür ist günstiger, als alle Schilder im Haus neu zu machen.",
      },
      {
        q: "Warum erkennt die Kamera den Code, schlägt aber keine Verbindung vor?",
        a: "Meist fehlt im Code der Verschlüsselungstyp oder er ist falsch. Zweite Möglichkeit: Der Code ist zu klein oder beschädigt — das Telefon liest die Adresse, zerlegt aber die Zeile WIFI: nicht. Prüfen Sie den Code vor dem Druck mit einem Scanner.",
      },
      {
        q: "Kann ein Code mehrere Netze enthalten?",
        a: "Nein, ein Code steht für ein Netz. Für zwei Netze braucht es zwei Codes oder eine Anleitungsseite mit Link.",
      },
    ],
    cta: "WLAN-Code erstellen",
    ctaHref: "/?type=wifi",
  },
  {
    slug: "qr-code-mit-logo",
    title: "QR-Code mit Logo: Marke im Code, nicht darauf",
    description:
      "Wie ein QR-Code mit Logo lesbar bleibt: Module ausschneiden statt Bild darüberlegen, Fehlerkorrektur, sinnvolle Logogröße und das Logo als Vektor im SVG.",
    h1: "QR-Code mit Logo: die Marke im Code, nicht darüber",
    lede: "Das Logo liegt nicht obenauf — die Module darunter sind ausgeschnitten, ringsum bleibt ein sauberer Rand, und der Code ist auf dem Scanner weiterhin lesbar.",
    demo: {
      value: "https://qr-ix.com/",
      label: "Link zum Generator — das Logo ist aus den Modulen ausgeschnitten, nicht aufgelegt",
    },
    sections: [
      {
        heading: "Warum ein Bild darüber nicht funktioniert",
        paragraphs: [
          "Ein QR-Code ist ein Raster aus Modulen, und jedes Quadrat trägt Datenbits und Steuerinformationen. Legt man ein Bild über einen Teil der Module, gehen Daten verloren. Die Fehlerkorrektur rettet einiges: Auf Stufe H verkraftet der Code den Verlust von bis zu 30 % der Fläche, aber blind ist die Grenze schnell überschritten — besonders bei kurzen Links mit weniger Modulen.",
          "Ein Logo „einfach mittig in den Editor zu setzen“ ist deshalb ein Glücksspiel. Mal liest es sich, mal nicht, und geprüft wird das meist erst nach dem Druck der Auflage.",
        ],
      },
      {
        heading: "Wie Qrix das macht",
        paragraphs: [
          "Die Module unter dem Logo werden nicht überdeckt, sondern aus dem Code ausgeschnitten, und das Muster ringsum wird mit sauberem Rand neu berechnet. Ändern Sie Größe, Abstand oder Rundung, wird die freigestellte Fläche ebenfalls neu berechnet.",
          "Wird das Logo für die gewählte Korrekturstufe zu groß, warnt die Oberfläche vor dem Export und nicht danach. Das ist keine Garantie für jeden Scanner der Welt, beseitigt aber den häufigsten Weg, einen Code zu ruinieren.",
        ],
      },
      {
        heading: "Größe und Fehlerkorrektur",
        paragraphs: [
          "Halten Sie das Logo bei etwa einem Viertel der Codefläche und verwenden Sie Korrektur H. Ein kontrastreiches Logo ohne feine Details ist besser: Auf einem kleinen Display oder einem billigen Scanner verschmelzen dünne Linien.",
          "Prüfen Sie den fertigen Code auf zwei bis drei Telefonen und bei schlechtem Licht. Ein schöner Code, der draußen nicht gelesen wird, ist nur ein Bild.",
        ],
      },
      {
        heading: "Das Logo bleibt Vektor",
        paragraphs: [
          "Ein SVG-Logo wird mit echten Pfaden in die Datei eingebettet, nicht als Rasterfläche. In Figma und Illustrator öffnet sich der Code als Vektor: Er lässt sich auf Schildergröße vergrößern, ohne Qualität zu verlieren.",
          "Das Logo kommt aus Ihrer Datei und wird im Browser verarbeitet — es geht nicht an einen Server. Das zählt, wenn darin eine noch unveröffentlichte Marke steckt oder Rechte Dritter betroffen sind.",
        ],
      },
    ],
    faq: [
      {
        q: "Wie groß darf das Logo sein?",
        a: "Praktische Grenze ist etwa ein Viertel der Codefläche bei Korrektur H. Darüber steigt das Risiko, dass ein billiger Scanner nicht mitkommt — besonders bei einem kurzen Link.",
      },
      {
        q: "Ist Korrektur H Pflicht?",
        a: "Bei einem Code mit Logo ja, das ist das sinnvolle Minimum. H stellt bis zu 30 % beschädigter Fläche wieder her, Q bis zu 25 %.",
      },
      {
        q: "Kann ich ein eigenes Logo hochladen?",
        a: "Ja, PNG oder SVG bis 1 MB. Die Datei wird lokal im Browser verarbeitet und nirgendwohin gesendet.",
      },
      {
        q: "Was tun, wenn der Code mit Logo nicht gelesen wird?",
        a: "Logo verkleinern, die Ruhezone um den Code vergrößern und die Korrektur auf H erhöhen. Hilft das nicht, nehmen Sie die dekorative Modulform heraus — auch sie kostet Fläche.",
      },
    ],
    cta: "Logo in den Code setzen",
    ctaHref: "/",
  },
  {
    slug: "bitcoin-qr-code",
    title: "Bitcoin-QR-Code: Adresse, Betrag und Label",
    description:
      "QR-Code für Bitcoin nach BIP-21: Adresse, Betrag, Label und message. Wie die Wallet den Betrag einsetzt und warum Genauigkeit wichtiger ist, als es scheint.",
    h1: "Bitcoin-QR-Code: Adresse, Betrag und Label nach BIP-21",
    lede: "Die Wallet trägt Adresse und Betrag selbst ein — niemand tippt die Adresse ab und vertut sich bei den Nullen.",
    demo: {
      value: "bitcoin:bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq?amount=0.015&label=Coffee%20Lab",
      label: "Adresse, Betrag von 0.015 BTC und Empfängerlabel — nach Standard BIP-21",
    },
    sections: [
      {
        heading: "Was im Code steht",
        paragraphs: [
          "Eine Zahlungsanforderung in Bitcoin beschreibt der Standard BIP-21: Schema bitcoin:, Adresse und nach dem Fragezeichen die Parameter. amount setzt den Betrag, label den Namen des Empfängers, message einen freien Text, den der Zahler sieht.",
          "Der Betrag steht in BTC als Dezimalbruch, nicht in satoshi. Das ist eine häufige Fehlerquelle: Ein „nach Augenmaß“ gebauter Code setzt den Betrag um den Faktor hundert Millionen zu hoch oder zu niedrig an.",
        ],
      },
      {
        heading: "Genauigkeit des Betrags",
        paragraphs: [
          "0.015 BTC lässt sich in binärer Gleitkomma-Arithmetik nicht exakt darstellen, ein naiver Umrechnungsschritt ergibt 0.01499999. In Qrix läuft die Umrechnung über BigInt, und im Code steht genau das, was Sie eingegeben haben.",
          "Bei Kryptowährungen ist das kein Pedantismus: Eine Abweichung um ein satoshi heißt, dass die Wallet einen anderen Betrag zeigt als vereinbart, und die Zahlung muss von Hand abgeglichen werden.",
        ],
      },
      {
        heading: "Verschiedene Netze, verschiedene Schemata",
        paragraphs: [
          "Bitcoin, Litecoin und Dogecoin nutzen BIP-21. Ethereum nutzt ERC-681, dort wird der Betrag in wei gerechnet. Solana nutzt Solana Pay, TON ein eigenes Schema in Nanotonen. Ein universelles „einfach Adresse und Betrag“ gibt es nicht — deshalb setzen Codes aus Diensten, die eine Vorlage über alles stülpen, oft keinen Betrag ein.",
          "Qrix baut das Schema für jedes Netz einzeln und prüft das Adressformat: base58, bech32, hex. Bei Token wie USDT landet nur die Adresse im Code — Netz und Contract erkennt die Wallet selbst.",
        ],
      },
      {
        heading: "Was der QR-Code nicht löst",
        paragraphs: [
          "Der Code enthält Adresse und Betrag — mehr nicht. Private Schlüssel kommen darin nicht vor, und eine Signatur lässt sich über einen QR-Code nicht fälschen. Schutz vor einer ausgetauschten Adresse ist er aber auch nicht: Wer Zugriff auf Ihre Druckvorlage hat, kann den ganzen Code ersetzen.",
          "Deshalb prüft man die ersten und letzten Zeichen der Adresse weiterhin mit den Augen und kontrolliert bei größeren Beträgen die Adresse in der Wallet selbst. Der QR-Code nimmt Tippfehler weg, ersetzt aber keine Aufmerksamkeit.",
        ],
      },
    ],
    faq: [
      {
        q: "Geht ein Code ohne Betrag?",
        a: "Ja. Dann setzt die Wallet nur die Adresse ein, und der Zahler gibt den Betrag selbst ein — praktisch für Spenden und Trinkgeld.",
      },
      {
        q: "Warum öffnet die Wallet die Adresse, setzt aber keinen Betrag ein?",
        a: "Wahrscheinlich passt das Schema nicht zum Netz: etwa BIP-21 für ein Netz, das ihn nicht unterstützt, oder ein Betrag in satoshi statt in BTC.",
      },
      {
        q: "Ist es sicher, so einen Code zu veröffentlichen?",
        a: "Ja. Im Code stehen nur eine öffentliche Adresse und ein Betrag. Private Schlüssel, Seed-Phrase und Passwörter kommen darin nie vor.",
      },
      {
        q: "Wird Lightning unterstützt?",
        a: "Nein. Blitzzahlungen nutzen das eigene Format BOLT11, das ist ein anderes Schema, und ein normaler Bitcoin-Code ersetzt es nicht.",
      },
    ],
    cta: "Bitcoin-Code erstellen",
    ctaHref: "/?type=crypto&coin=btc",
  },
  {
    slug: "qr-code-svg",
    title: "QR-Code als SVG: ein Vektor für den Druck",
    description:
      "Warum für Druck und Layout SVG statt PNG zählt: ein Vektorpfad statt hundert Ebenen und echte Löcher in den Markern. Dazu die Anforderungen an den Druck.",
    h1: "QR-Code als SVG: ein Vektor für Druck und Layout",
    lede: "Der ganze Code ist ein einziger Vektorpfad. In Figma und Illustrator ist das ein Objekt, das sich auf Schildergröße skalieren lässt, ohne Qualität zu verlieren.",
    demo: {
      value: "https://example.com/poster",
      label: "Link für das Drucklayout — der Code bleibt in jeder Größe Vektor",
    },
    sections: [
      {
        heading: "Warum nicht PNG",
        paragraphs: [
          "PNG ist ein Raster: ein Pixelgitter fester Größe. Auf dem Bildschirm sieht es in Ordnung aus, beim Vergrößern im Layout oder im Druck werden die Modulkanten unscharf und feine Elemente verschmelzen. Der Scanner braucht klare Kanten, keine Glättung.",
          "Für Visitenkarte und Flyer reicht oft ein PNG mit 1000 Pixeln. Für Banner, Schild oder Verpackung braucht es einen Vektor — sonst nimmt die Druckerei die Datei nicht an oder druckt Matsch.",
        ],
      },
      {
        heading: "Ein Pfad statt hundert Ebenen",
        paragraphs: [
          "Im Export von Qrix sind Module, Markerkonturen und Suchmuster in einem einzigen path-Element mit der Füllregel `nonzero` zusammengefasst. Die Innenkonturen der Marker laufen gegen den Uhrzeigersinn und ergeben echte Löcher statt weißer Flicken.",
          "Der Unterschied in der Praxis: In Illustrator und Figma öffnet sich die Datei als ein Objekt. Es lässt sich einfärben, skalieren und über ein Layout legen, ohne hundert einzelne Quadrate auseinanderzunehmen.",
        ],
      },
      {
        heading: "Anforderungen an den Druck",
        paragraphs: [
          "Lassen Sie eine Ruhezone um den Code — mindestens vier Module, besser mehr. Drucken Sie nicht auf Glanzpapier, Folie oder dunklem Grund: Reflexe und geringer Kontrast zerstören die Lesbarkeit schneller als Fehler in den Daten.",
          "Die kleinste Größe auf Papier liegt bei etwa 2 Zentimetern Seitenlänge, bei langen Links mehr. Prüfen Sie das Layout auf einem echten Drucker und scannen Sie aus der Entfernung, aus der Menschen den Code scannen werden.",
        ],
      },
      {
        heading: "Auch die Beschriftung bleibt Vektor",
        paragraphs: [
          "Schalten Sie die Beschriftung unter dem Code ein, wird der Text in Konturen der mitgelieferten Schrift umgewandelt. Im Layout wird er nicht durch eine Systemschrift ersetzt und „verrutscht“ nicht beim Öffnen auf einem anderen Rechner — genau das passiert sonst mit Textebenen in fremden Dateien.",
          "Die Beschriftung liegt außerhalb der Ruhezone des Symbols und beeinflusst das Lesen nach Standard nicht.",
        ],
      },
    ],
    faq: [
      {
        q: "Welche Auflösung braucht dann das PNG?",
        a: "Für den Druck mindestens 1000 Pixel pro Seite, und prüfen Sie die physische Größe: 300 dpi für 5 Zentimeter sind etwa 590 Pixel.",
      },
      {
        q: "Geht auch CMYK?",
        a: "SVG speichert Farbe in RGB. Für die Druckerei konvertieren Sie im Layout oder beim PDF-Export — besser einmal konvertieren und auf einem Probedruck prüfen.",
      },
      {
        q: "Braucht es einen Beschnitt?",
        a: "Steht der Code nah an der Kante, ja — dann im Layout einen Beschnitt anlegen. Den Code selbst halten Sie aber besser weiter von der Schnittlinie entfernt, damit er nicht angeschnitten wird.",
      },
      {
        q: "Eignet sich SVG für Stickerei oder Gravur?",
        a: "Für Gravur meist ja, solange die Konturen klar sind. Für Stickerei braucht es eine eigene Vorbereitung: feine Module gehen im Stich unter, der Code sollte also größer und die Form einfacher werden.",
      },
    ],
    cta: "SVG-Code herunterladen",
    ctaHref: "/",
  },
];

export const de: LandingBundle = { chrome, pages };
