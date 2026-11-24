import type { LandingBundle } from "../types";

const chrome = {
  htmlLang: "fr",
  langName: "Français",
  tagline: "Pas de carré. Juste un code.",
  openApp: "Ouvrir le générateur",
  demoTitle: "Ce que contient ce code",
  faqTitle: "L'essentiel en bref",
  guidesTitle: "Autres guides",
  footerNote: "Les codes sont générés entièrement dans le navigateur : adresses, mots de passe et montants ne sont jamais envoyés.",
  breadcrumbHome: "Générateur de QR codes",
  langSwitchLabel: "Langue de la page",
  footerAuthor: "Qrix — générateur de QR codes",
};

const pages = [
  {
    slug: "qr-code-wifi",
    title: "QR code Wi-Fi : vos invités se connectent seuls",
    description:
      "Comment créer un QR code Wi-Fi pour que vos invités se connectent sans mot de passe sur un papier. Format WIFI:, échappement des caractères et réseau masqué.",
    h1: "QR code Wi-Fi : vos invités se connectent sans mot de passe sur un papier",
    lede: "On pointe l'appareil photo du téléphone, et le système propose de se connecter au réseau. Plus besoin de dicter le mot de passe ni de l'épeler lettre par lettre.",
    demo: {
      value: "WIFI:T:WPA;S:Coffee Lab;P:espresso2026;;",
      label: "Type de chiffrement, nom du réseau et mot de passe : tout est dans le code",
    },
    sections: [
      {
        heading: "Comment ça fonctionne",
        paragraphs: [
          "Le QR contient une chaîne au format WIFI: qui réunit quatre champs : le type de chiffrement (T), le nom du réseau (S), le mot de passe (P) et l'indicateur de réseau masqué (H). Le téléphone la découpe et préremplit la fenêtre de connexion du système. Aucune application et aucune connexion internet ne sont nécessaires : l'information est déjà dans l'image.",
          "Le code fonctionne donc indéfiniment : il ne renvoie vers aucun site, ne dépend d'aucun hébergement et continuera de s'ouvrir même après un changement de fournisseur d'accès. Seul l'état physique peut l'abîmer : soleil, eau ou impression trop petite.",
        ],
      },
      {
        heading: "Les caractères qui cassent le code",
        paragraphs: [
          "Dans le format WIFI:, les séparateurs sont le point-virgule, les deux-points, la virgule, l'antislash et le guillemet double. Si le mot de passe en contient un, il faut l'échapper avec un antislash, sinon le téléphone coupe le mot de passe au séparateur et la connexion échoue.",
          "Qrix applique l'échappement normalisé automatiquement : un mot de passe du type `coffee;2026` ne se retrouve pas scindé en deux. Même chose pour les accents dans le nom du réseau : ils sont encodés en UTF-8 et lus correctement par les téléphones.",
        ],
      },
      {
        heading: "Où l'afficher",
        paragraphs: [
          "Sur le comptoir de l'accueil, sur une table de café, dans une salle de réunion, sur le Wi-Fi invité d'un appartement, dans l'espace d'attente d'un salon. Le plus pratique est de le placer près d'une prise ou bien en vue à l'entrée, là où le visiteur a déjà son téléphone en main.",
          "Pour l'imprimé, prenez le SVG : il ne bave pas à l'agrandissement et s'imprime à n'importe quelle taille. Pour un écran ou une messagerie, un PNG suffit. Le côté minimal du code tourne autour de 2 centimètres en impression, sinon l'appareil photo ne distingue plus les modules.",
        ],
      },
      {
        heading: "À garder en tête",
        paragraphs: [
          "Le QR code ne chiffre pas le mot de passe : quiconque le voit obtient l'accès au réseau. N'affichez donc pas celui du réseau principal : créez plutôt un SSID invité distinct, que vous pouvez changer en une manipulation sans reconfigurer les appareils de travail.",
          "Et ne donnez pas au réseau invité l'accès aux ressources locales : imprimantes, NAS, caméras. Le QR répond au besoin de se connecter vite, pas à celui de se connecter de façon sûre.",
        ],
      },
    ],
    faq: [
      {
        q: "Faut-il internet pour se connecter avec ce code ?",
        a: "Non. Les informations du réseau sont dans le code lui-même, le téléphone n'a rien à télécharger. Internet arrive une fois la connexion établie.",
      },
      {
        q: "Que faire s'il faut changer le mot de passe ?",
        a: "Un code statique doit être réimprimé. C'est justement pourquoi on crée un réseau invité à part : changer son mot de passe coûte moins cher que refaire les affiches de tout l'établissement.",
      },
      {
        q: "Pourquoi l'appareil photo voit le code mais ne propose pas de se connecter ?",
        a: "Le plus souvent, le type de chiffrement manque ou il est erroné. Autre possibilité : le code est trop petit ou abîmé, le téléphone lit l'adresse mais ne décode pas la chaîne WIFI:. Vérifiez le code avec un scanner avant l'impression.",
      },
      {
        q: "Peut-on faire un seul code pour plusieurs réseaux ?",
        a: "Non, un code correspond à un réseau. Pour deux réseaux, il faut deux codes ou une page d'instructions avec un lien.",
      },
    ],
    cta: "Créer un code Wi-Fi",
    ctaHref: "/?type=wifi",
  },
  {
    slug: "qr-code-avec-logo",
    title: "QR code avec logo : la marque dans le code",
    description:
      "Comment créer un QR code avec logo sans le rendre illisible : découpe des modules au lieu d'une image posée dessus, correction d'erreur et rendu vectoriel SVG.",
    h1: "QR code avec logo : la marque dans le code, pas par-dessus",
    lede: "Le logo n'est pas collé au-dessus : les modules qu'il occupe sont découpés, une marge nette reste autour, et le code se lit toujours au scanner.",
    demo: {
      value: "https://qr-ix.com/",
      label: "Lien vers le générateur : le logo est découpé dans les modules, pas superposé",
    },
    sections: [
      {
        heading: "Pourquoi on ne pose pas simplement une image",
        paragraphs: [
          "Un QR code est une grille de modules, où chaque carré porte des bits de données et des informations de service. Si une image recouvre une partie des modules, les données sont perdues. La correction d'erreur compense en partie ces pertes : au niveau H, le code tolère jusqu'à 30 % de surface perdue, mais on franchit vite la limite à l'aveugle, surtout sur les liens courts où il y a moins de modules.",
          "« Poser le logo au centre dans un logiciel » relève donc du hasard. Tantôt ça se lit, tantôt non, et on le découvre en général après l'impression du tirage.",
        ],
      },
      {
        heading: "Comment Qrix procède",
        paragraphs: [
          "Les modules sous le logo ne sont pas recouverts : ils sont retirés du code, et le motif autour est recalculé avec une marge nette. Si vous changez la taille, l'espacement ou l'arrondi, la zone découpée est recalculée en même temps.",
          "Si le logo devient trop grand pour le niveau de correction choisi, l'interface prévient avant l'export, et non après. Ce n'est pas une garantie valable pour tous les scanners du monde, mais cela supprime la façon la plus courante de ruiner un code.",
        ],
      },
      {
        heading: "Taille et correction d'erreur",
        paragraphs: [
          "Gardez le logo dans un ordre de grandeur d'un quart de la surface du code et réglez la correction sur H. Mieux vaut un logo contrasté et sans petits détails : sur un écran réduit ou un scanner bon marché, les traits fins se mélangent.",
          "Testez impérativement le code final sur deux ou trois téléphones et en faible luminosité. Un code élégant qui ne se lit pas dans la rue n'est qu'une image.",
        ],
      },
      {
        heading: "Le logo reste vectoriel",
        paragraphs: [
          "Un logo SVG est intégré au fichier sous forme de tracés réels, et non d'une image matricielle placée en dessous. Dans Figma et Illustrator, ce code s'ouvre comme un vecteur : on peut l'agrandir jusqu'au format d'une enseigne sans perte de qualité.",
          "Le logo vient de votre fichier et il est traité dans le navigateur : il n'est pas envoyé à un serveur. C'est utile si le logo contient une marque non publiée ou des droits appartenant à un tiers.",
        ],
      },
    ],
    faq: [
      {
        q: "Quelle taille le logo peut-il atteindre ?",
        a: "En pratique, environ un quart de la surface du code avec la correction H. Au-delà, le risque augmente qu'un scanner bon marché ne suive pas, surtout si le lien est court.",
      },
      {
        q: "Faut-il vraiment la correction H ?",
        a: "Pour un code avec logo, oui, c'est le minimum raisonnable. H restaure jusqu'à 30 % de surface abîmée, Q jusqu'à 25 %.",
      },
      {
        q: "Peut-on charger son propre logo ?",
        a: "Oui, en PNG ou en SVG jusqu'à 1 Mo. Le fichier est traité localement dans le navigateur et n'est envoyé nulle part.",
      },
      {
        q: "Que faire si le code avec logo ne se lit pas ?",
        a: "Réduisez le logo, augmentez la marge autour du code et passez la correction en H. Si cela ne suffit pas, retirez la forme décorative des modules : elle aussi consomme de la surface.",
      },
    ],
    cta: "Ajouter un logo au code",
    ctaHref: "/",
  },
  {
    slug: "qr-code-bitcoin",
    title: "QR code Bitcoin : adresse, montant et libellé",
    description:
      "QR code Bitcoin au standard BIP-21 : adresse, montant, libellé et message. Comment le portefeuille préremplit le montant et pourquoi la précision compte.",
    h1: "QR code Bitcoin : adresse, montant et libellé au format BIP-21",
    lede: "Le portefeuille remplit l'adresse et le montant tout seul : le payeur ne recopie pas l'adresse à la main et ne se trompe pas du nombre de zéros.",
    demo: {
      value: "bitcoin:bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq?amount=0.015&label=Coffee%20Lab",
      label: "Adresse, montant de 0.015 BTC et libellé du destinataire, au standard BIP-21",
    },
    sections: [
      {
        heading: "Ce que contient le code",
        paragraphs: [
          "Une demande de paiement en bitcoin est décrite par le standard BIP-21 : le schéma bitcoin:, l'adresse, puis, après le point d'interrogation, des paramètres. amount fixe le montant, label le nom du destinataire, message un texte libre que le payeur verra.",
          "Le montant s'exprime en BTC sous forme décimale, et non en satoshi. C'est une source fréquente de confusion : un code assemblé « à vue » injecte un montant cent millions de fois trop grand ou trop petit.",
        ],
      },
      {
        heading: "La précision du montant",
        paragraphs: [
          "0.015 BTC n'est pas représentable exactement en virgule flottante binaire, un calcul naïf donne donc 0.01499999. Qrix convertit le montant via BigInt, et ce qui entre dans le code est exactement ce que vous avez saisi.",
          "Pour les cryptomonnaies, ce n'est pas du pédantisme : un écart d'un satoshi signifie que le portefeuille affichera un montant différent de celui convenu, et que le paiement devra être rapproché à la main.",
        ],
      },
      {
        heading: "Des réseaux, des schémas",
        paragraphs: [
          "Bitcoin, Litecoin et Dogecoin utilisent BIP-21. Ethereum passe par ERC-681, où le montant se compte en wei. Solana utilise Solana Pay, TON dispose de son propre schéma en nanoton. Un « adresse et montant » universel n'existe pas : c'est pourquoi les codes issus de services qui appliquent un seul gabarit à tout ne remplissent souvent pas le montant.",
          "Qrix construit le schéma réseau par réseau et contrôle le format de l'adresse : base58, bech32, hex. Pour les jetons comme USDT, seule l'adresse entre dans le code : c'est le portefeuille qui détermine le réseau et le contrat.",
        ],
      },
      {
        heading: "Ce que le QR ne règle pas",
        paragraphs: [
          "Le code contient une adresse et un montant, rien de plus. Les clés privées n'y figurent pas, et aucune signature ne peut être falsifiée via un QR. Il ne protège pas non plus d'une substitution d'adresse : quelqu'un qui accède à votre mise en page peut remplacer le code entier.",
          "On vérifie donc toujours à l'œil les premiers et derniers caractères de l'adresse, et pour les grosses sommes on contrôle l'adresse dans le portefeuille lui-même. Le QR supprime les fautes de frappe, il ne remplace pas l'attention.",
        ],
      },
    ],
    faq: [
      {
        q: "Peut-on faire un code sans montant ?",
        a: "Oui. Le portefeuille ne préremplit alors que l'adresse et le payeur saisit le montant lui-même, ce qui convient aux dons et aux pourboires.",
      },
      {
        q: "Pourquoi le portefeuille ouvre l'adresse sans remplir le montant ?",
        a: "Le schéma ne correspond probablement pas au réseau : par exemple BIP-21 pour un réseau qui ne le prend pas en charge, ou un montant en satoshi au lieu de BTC.",
      },
      {
        q: "Est-il sûr de publier un tel code ?",
        a: "Oui. Le code ne contient qu'une adresse publique et un montant. Les clés privées, la phrase seed et les mots de passe n'y entrent jamais.",
      },
      {
        q: "Lightning est-il pris en charge ?",
        a: "Non. Les paiements Lightning utilisent un format distinct, BOLT11 : c'est un autre schéma, et un code bitcoin classique ne le remplace pas.",
      },
    ],
    cta: "Créer un code Bitcoin",
    ctaHref: "/?type=crypto&coin=btc",
  },
  {
    slug: "qr-code-svg",
    title: "QR code en SVG : un seul vecteur pour l'impression",
    description:
      "Pourquoi l'imprimé demande du SVG et non du PNG : un seul tracé vectoriel au lieu de cent calques, de vrais trous dans les repères et un libellé en courbes.",
    h1: "QR code en SVG : un seul vecteur pour l'impression et les maquettes",
    lede: "Tout le code tient dans un seul tracé vectoriel. Dans Figma et Illustrator, c'est un objet unique qui s'agrandit au format d'une enseigne sans perte de qualité.",
    demo: {
      value: "https://example.com/poster",
      label: "Lien pour une maquette imprimée : le code reste vectoriel à toute taille",
    },
    sections: [
      {
        heading: "Pourquoi pas du PNG",
        paragraphs: [
          "Le PNG est une image matricielle : une grille de pixels de taille fixe. À l'écran, il passe bien, mais dès qu'on l'agrandit dans une maquette ou à l'impression, les bords des modules bavent et les petits éléments se mélangent. Le scanner a besoin de limites nettes, pas de lissage.",
          "Pour une carte de visite ou un flyer, un PNG de 1000 pixels suffit souvent. Pour une bâche, une enseigne ou un emballage, il faut du vectoriel : sinon l'imprimeur refuse simplement le fichier, ou imprime une bouillie.",
        ],
      },
      {
        heading: "Un seul tracé au lieu de cent calques",
        paragraphs: [
          "À l'export Qrix, les modules, les contours des motifs de repérage et leur noyau central sont réunis dans un unique élément path avec la règle de remplissage nonzero. Les contours intérieurs des repères tournent dans le sens antihoraire et produisent de vrais trous, et non des pastilles blanches.",
          "La différence en pratique : dans Illustrator et Figma, le fichier s'ouvre comme un objet unique. On peut le colorer, le mettre à l'échelle et le poser sur une maquette sans démonter cent carrés séparés.",
        ],
      },
      {
        heading: "Contraintes d'impression",
        paragraphs: [
          "Laissez une zone de silence autour du code : au minimum quatre modules, et davantage si possible. N'imprimez pas sur du brillant, du film métallisé ou un fond sombre : les reflets et le faible contraste tuent la lecture plus vite qu'une erreur dans les données.",
          "La taille minimale sur papier tourne autour de 2 centimètres de côté, davantage pour les liens longs. Vérifiez la maquette sur une imprimante réelle et scannez à la distance depuis laquelle les gens scanneront.",
        ],
      },
      {
        heading: "Le libellé reste vectoriel lui aussi",
        paragraphs: [
          "Si vous activez le libellé sous le code, le texte est converti en courbes de sa propre police. Dans la maquette, il ne sera pas remplacé par une police système et ne se décalera pas à l'ouverture sur une autre machine, ce qui arrive justement souvent aux calques de texte dans les fichiers qu'on reçoit.",
          "Le libellé se place en dehors de la zone de silence du symbole : il n'affecte donc pas la lecture, conformément au standard.",
        ],
      },
    ],
    faq: [
      {
        q: "Quelle résolution pour le PNG, alors ?",
        a: "Pour l'impression, prenez au moins 1000 pixels de côté et vérifiez la taille physique : 300 dpi pour 5 centimètres, c'est environ 590 pixels.",
      },
      {
        q: "Peut-on obtenir du CMYK ?",
        a: "Le SVG stocke la couleur en RGB. Pour l'imprimeur, convertissez dans la maquette ou à l'export PDF : mieux vaut le faire une seule fois et contrôler sur une épreuve.",
      },
      {
        q: "Faut-il un fond perdu ?",
        a: "Si le code est proche du bord, oui, ajoutez un fond perdu dans la maquette. Mais gardez le code lui-même à distance de la ligne de coupe, pour qu'il ne soit pas rogné.",
      },
      {
        q: "Le SVG convient-il à la broderie ou à la gravure ?",
        a: "Pour la gravure, en général oui, si les contours sont nets. Pour la broderie, une préparation spécifique est nécessaire : les modules fins se perdent dans les points, il vaut mieux agrandir le code et simplifier la forme.",
      },
    ],
    cta: "Télécharger le code en SVG",
    ctaHref: "/",
  },
];

export const fr: LandingBundle = { chrome, pages };
