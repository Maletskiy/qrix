import type { LandingBundle } from "../types";

const chrome = {
  htmlLang: "en",
  langName: "English",
  tagline: "There is no square. There is code.",
  openApp: "Open the generator",
  demoTitle: "What this code contains",
  faqTitle: "The short answers",
  guidesTitle: "More guides",
  footerNote: "Codes are built entirely in your browser — addresses, passwords and amounts never leave your device.",
  breadcrumbHome: "QR code generator",
  langSwitchLabel: "Page language",
  footerAuthor: "Qrix — QR code generator",
};

const pages = [
  {
    slug: "wifi-qr",
    title: "Wi-Fi QR code: guests connect themselves",
    description:
      "How to make a Wi-Fi QR code so guests connect without typing a password. The WIFI: format, escaped characters, hidden networks, and why a camera may refuse to connect.",
    h1: "Wi-Fi QR code: guests connect without reading a password aloud",
    lede: "Point the phone camera at the code and the system offers to join the network. No dictation, no sticky note, no spelling the password letter by letter.",
    demo: {
      value: "WIFI:T:WPA;S:Coffee Lab;P:espresso2026;;",
      label: "Encryption type, network name and password — all inside the code",
    },
    sections: [
      {
        heading: "How it works",
        paragraphs: [
          "The code holds a string in the WIFI: format with four fields: encryption type (T), network name (S), password (P) and a flag for hidden networks (H). The phone parses it and fills the system join dialog. No app, no internet needed for that step — everything is already inside the image.",
          "That is also why the code keeps working: it does not point at a website, does not depend on hosting, and will not break when you change providers. It can only fail physically — sun, water, or printing it too small.",
        ],
      },
      {
        heading: "Characters that break the code",
        paragraphs: [
          "In the WIFI: format the separators are semicolon, colon, comma, backslash and double quote. If the password contains one of them, the character must be escaped with a backslash; otherwise the phone cuts the password at the separator and the join fails.",
          "Qrix escapes by the standard automatically, so a password like `coffee;2026` does not split the code in two. The same applies to non-Latin network names: they are encoded as UTF-8 and read correctly by phones.",
        ],
      },
      {
        heading: "Where to put it",
        paragraphs: [
          "The reception desk, a café table, a meeting room, the guest network at home, a waiting area. Put the code where the phone is already in hand — near a socket or right at the entrance.",
          "For print, take SVG: it does not blur when scaled and prints at any size. For a screen or a chat, PNG is enough. Keep the printed code at least two centimetres across, otherwise the camera struggles to resolve the modules.",
        ],
      },
      {
        heading: "What it does not protect",
        paragraphs: [
          "A QR code does not encrypt the password: anyone who sees it gets access to the network. Do not put your main network on a printed code. Create a separate guest SSID that you can rotate with one tap without reconnecting work devices.",
          "And keep the guest network away from local resources: printers, NAS drives, cameras. A QR code solves “join quickly”, not “join safely”.",
        ],
      },
    ],
    faq: [
      {
        q: "Does the guest need internet to join?",
        a: "No. The network details live inside the code itself, so the phone does not need to download anything. Internet appears after the join.",
      },
      {
        q: "What if I have to change the password later?",
        a: "A static code has to be reprinted. That is exactly why you run a separate guest network: rotating its password is cheaper than redoing the signage.",
      },
      {
        q: "Why does the camera read the code but not offer to join?",
        a: "Usually the encryption type is missing or wrong. Second most common: the code is too small or damaged, so the phone reads the text but cannot parse the WIFI: string. Test the code with a scanner before printing.",
      },
      {
        q: "Can one code cover several networks?",
        a: "No, one code, one network. For two networks you need two codes or a landing page with instructions.",
      },
    ],
    cta: "Make a Wi-Fi code",
    ctaHref: "/?type=wifi",
  },
  {
    slug: "qr-code-with-logo",
    title: "QR code with a logo that still scans",
    description:
      "How to put a logo in a QR code without breaking it: cutting modules out instead of overlaying an image, error correction levels, a safe logo size and real vector output in SVG.",
    h1: "QR code with a logo: the brand inside the code, not on top of it",
    lede: "The logo is not pasted over the code. The modules underneath are cut out, a clean margin is kept around it, and the code stays readable on a scanner.",
    demo: {
      value: "https://qr-ix.com/",
      label: "A link with a logo cut out of the modules instead of laid on top",
    },
    sections: [
      {
        heading: "Why overlaying an image is a gamble",
        paragraphs: [
          "A QR code is a grid of modules where every square carries data or service information. Cover part of the modules with a picture and you lose data. Error correction helps: level H survives losing up to 30% of the area, but eyeballing it easily overshoots — especially with short links, where there are fewer modules to spare.",
          "So “drop a logo in the middle in an editor” is a coin flip. Sometimes it scans, sometimes it does not, and you usually find out after the print run.",
        ],
      },
      {
        heading: "How Qrix does it",
        paragraphs: [
          "Modules under the logo are cut out of the code rather than covered, and the pattern around them is rebuilt with a clean margin. Change the size, the gap or the corner radius and the cut-out area is recalculated with them.",
          "If the logo grows past what the selected error correction can absorb, the interface warns you before export, not after. It is not a guarantee for every scanner on earth, but it removes the most common way to ruin a code.",
        ],
      },
      {
        heading: "Logo size and error correction",
        paragraphs: [
          "Keep the logo within roughly a quarter of the code area and set correction to H. Make it high-contrast and free of small detail: on a small screen or a cheap scanner, thin lines bleed into the modules.",
          "Always test the finished code on two or three phones in bad light. A beautiful code that does not scan outdoors is just a picture.",
        ],
      },
      {
        heading: "The logo stays vector",
        paragraphs: [
          "An SVG logo is embedded as real paths, not as a raster layer. In Figma and Illustrator the code opens as vector geometry you can scale to a billboard without losing quality.",
          "The logo is read from your file and processed in the browser — it is never uploaded. That matters when the logo is an unreleased brand or someone else's licensed artwork.",
        ],
      },
    ],
    faq: [
      {
        q: "How big can the logo be?",
        a: "A practical ceiling is about a quarter of the code area at correction H. Beyond that the risk grows that a cheap scanner fails, especially when the link is short.",
      },
      {
        q: "Do I have to use correction H?",
        a: "For a code with a logo, yes — it is the sane minimum. H recovers up to 30% of damaged area, Q up to 25%.",
      },
      {
        q: "Can I upload my own logo?",
        a: "Yes, PNG or SVG up to 1 MB. The file is processed locally in the browser and never sent anywhere.",
      },
      {
        q: "What if the code with a logo does not scan?",
        a: "Shrink the logo, increase the margin around the code, raise correction to H. If that fails, drop the decorative module shape — it also eats into the area.",
      },
    ],
    cta: "Add a logo to the code",
    ctaHref: "/",
  },
  {
    slug: "bitcoin-qr-code",
    title: "Bitcoin QR code: address, amount and label",
    description:
      "A Bitcoin payment QR code built on BIP-21: address, amount, label and message. Why the wallet pre-fills the amount, and why precision matters more than it looks.",
    h1: "Bitcoin QR code: address, amount and label via BIP-21",
    lede: "The wallet fills in the address and the amount itself, so the payer never retypes a long address or miscounts the zeros.",
    demo: {
      value: "bitcoin:bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq?amount=0.015&label=Coffee%20Lab",
      label: "Address, 0.015 BTC and a recipient label, per BIP-21",
    },
    sections: [
      {
        heading: "What is inside the code",
        paragraphs: [
          "A Bitcoin payment request follows BIP-21: the bitcoin: scheme, the address, and parameters after a question mark. amount sets the sum, label names the recipient, message is free text the payer will see.",
          "The amount is written in BTC as a decimal fraction, not in satoshis. This is a common source of confusion: a code assembled by hand can end up asking for a hundred million times more or less.",
        ],
      },
      {
        heading: "Precision of the amount",
        paragraphs: [
          "0.015 BTC is not exactly representable in binary floating point, so a naive conversion yields 0.01499999. Qrix converts with BigInt, and the code carries exactly what you typed.",
          "In crypto this is not pedantry: a one-satoshi drift means the wallet shows a different amount than agreed, and the payment has to be reconciled by hand.",
        ],
      },
      {
        heading: "Different chains, different schemes",
        paragraphs: [
          "Bitcoin, Litecoin and Dogecoin use BIP-21. Ethereum uses ERC-681, where the sum is denominated in wei. Solana uses Solana Pay, TON has its own nano-ton scheme. There is no universal “address and amount” — which is exactly why codes from services that apply one template to everything often fail to pre-fill the amount.",
          "Qrix builds the scheme per chain and validates the address format: base58, bech32, hex. For tokens like USDT the code carries only the address, since the wallet determines the network and contract itself.",
        ],
      },
      {
        heading: "What a QR code does not do",
        paragraphs: [
          "The code holds an address and an amount, nothing more. Private keys never enter it, and a signature cannot be forged through it. But it is not protection against substitution either: anyone with access to your layout can replace the whole code.",
          "That is why people still check the first and last characters of the address, and for large sums verify it in the wallet. A QR code removes typos, not the need to pay attention.",
        ],
      },
    ],
    faq: [
      {
        q: "Can I make a code without an amount?",
        a: "Yes. The wallet then pre-fills only the address and the payer enters the sum — handy for donations and tips.",
      },
      {
        q: "Why does the wallet open the address but not the amount?",
        a: "Most likely the scheme does not match the chain: BIP-21 on a network that does not support it, or an amount in satoshis where BTC is expected.",
      },
      {
        q: "Is it safe to publish such a code?",
        a: "Yes. It contains a public address and a sum. Private keys, seed phrases and passwords never go in.",
      },
      {
        q: "Is Lightning supported?",
        a: "No. Lightning payments use a separate BOLT11 format; a regular Bitcoin code will not work for them.",
      },
    ],
    cta: "Make a Bitcoin code",
    ctaHref: "/?type=crypto&coin=btc",
  },
  {
    slug: "svg-qr-code",
    title: "SVG QR code: one vector for print",
    description:
      "Why print work needs SVG rather than PNG: a single vector path instead of a hundred layers, real holes in the finder markers, and a caption converted to outlines.",
    h1: "SVG QR code: one vector path for print and layout",
    lede: "The whole code is a single vector path. In Figma and Illustrator it opens as one object that scales to a billboard without losing quality.",
    demo: {
      value: "https://example.com/poster",
      label: "A link for a print layout — the code stays vector at any size",
    },
    sections: [
      {
        heading: "Why not PNG",
        paragraphs: [
          "PNG is raster: a pixel grid of fixed size. It looks fine on screen, but scale it in a layout or in print and the module edges blur while small elements merge. A scanner needs crisp boundaries, not antialiasing.",
          "For a business card or a flyer, a 1000-pixel PNG is often enough. For a banner, signage or packaging you need vector — otherwise the print shop rejects the file or prints mush.",
        ],
      },
      {
        heading: "One path instead of a hundred layers",
        paragraphs: [
          "Qrix exports modules, marker frames and cores as a single path element with the nonzero fill rule. Inner marker contours run counter-clockwise, producing real holes rather than white patches.",
          "The practical difference: Illustrator and Figma open the file as one object. You can recolor it, scale it and place it in a layout without wrangling a hundred separate squares.",
        ],
      },
      {
        heading: "Print requirements",
        paragraphs: [
          "Leave a quiet zone around the code — at least four modules, more is better. Avoid gloss, foil and dark backgrounds: glare and low contrast kill scanning faster than errors in the data.",
          "The minimum size on paper is about two centimetres per side, more for long links. Check the layout on a real printer and scan it from the distance people will actually use.",
        ],
      },
      {
        heading: "The caption stays vector too",
        paragraphs: [
          "If you enable the caption, the text is converted to outlines of its own typeface. It will not be swapped for a system font or reflow when someone opens the file on another machine — which is exactly what usually happens to live text layers in someone else's document.",
          "The caption sits outside the symbol's quiet zone, so by the standard it cannot affect scanning.",
        ],
      },
    ],
    faq: [
      {
        q: "What PNG resolution should I use instead?",
        a: "For print, at least 1000 pixels per side, and check the physical size: 300 dpi across 5 cm is about 590 pixels.",
      },
      {
        q: "Can I get CMYK?",
        a: "SVG stores colour as RGB. Convert in your layout tool or on PDF export — do it once and check a proof print.",
      },
      {
        q: "Do I need bleed?",
        a: "If the code sits near the trim edge, add bleed in the layout. Better still, keep the code away from the cut line so it cannot be trimmed off.",
      },
      {
        q: "Does SVG work for engraving or embroidery?",
        a: "For engraving, usually yes, as long as the contours are clean. Embroidery needs separate preparation: thin modules disappear in stitching, so enlarge the code and simplify the shape.",
      },
    ],
    cta: "Download the code as SVG",
    ctaHref: "/",
  },
];

export const en: LandingBundle = { chrome, pages };
