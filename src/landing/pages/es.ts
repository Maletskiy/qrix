import type { LandingBundle } from "../types";

const chrome = {
  htmlLang: "es",
  langName: "Español",
  tagline: "No es un cuadrado. Es un código.",
  openApp: "Abrir el generador",
  demoTitle: "Qué lleva dentro este código",
  faqTitle: "Lo esencial, en breve",
  guidesTitle: "Otras guías",
  hubTitle: "Guías de códigos QR",
  hubLede: "Guías prácticas: Wi-Fi para invitados, logo dentro del código, pago en Bitcoin y vectorial para impresión.",
  footerNote: "Los códigos se generan enteramente en el navegador: las direcciones, las contraseñas y los importes no se envían a ninguna parte.",
  breadcrumbHome: "Generador de códigos QR",
  langSwitchLabel: "Idioma de la página",
  footerAuthor: "Qrix — generador de códigos QR",
};

const pages = [
  {
    slug: "codigo-qr-wifi",
    title: "Código QR para Wi-Fi: los invitados se conectan solos",
    description:
      "Cómo hacer un QR de Wi-Fi para que los invitados se conecten sin contraseña: el formato WIFI:, el escapado, la red oculta y los errores que rompen el código.",
    h1: "Código QR para Wi-Fi: los invitados se conectan sin la contraseña en un papelito",
    lede: "Basta con apuntar la cámara del móvil para que el sistema ofrezca conectarse a la red. Nadie dicta la contraseña, nadie la imprime en una pegatina y nadie la repite letra por letra.",
    demo: {
      value: "WIFI:T:WPA;S:Coffee Lab;P:espresso2026;;",
      label: "Tipo de cifrado, nombre de la red y contraseña: todo va dentro del código",
    },
    sections: [
      {
        heading: "Cómo funciona",
        paragraphs: [
          "Dentro del QR hay una cadena con formato WIFI: y cuatro campos: el tipo de cifrado (T), el nombre de la red (S), la contraseña (P) y el indicador de red oculta (H). El teléfono la interpreta y traslada los datos al diálogo de conexión del sistema. No hace falta ninguna aplicación ni conexión a internet: la información ya está dentro de la imagen.",
          "Por eso el código funciona para siempre: no remite a un sitio web, no depende de un alojamiento y no dejará de abrirse cuando cambies de proveedor. Solo puede estropearse físicamente: por el sol, el agua o una impresión demasiado pequeña.",
        ],
      },
      {
        heading: "Los caracteres que rompen el código",
        paragraphs: [
          "En el formato WIFI: los separadores son el punto y coma, los dos puntos, la coma, la barra invertida y las comillas dobles. Si la contraseña contiene alguno de ellos, hay que escaparlo con una barra invertida; de lo contrario el teléfono corta la contraseña en el separador y la conexión no se completa.",
          "En Qrix el escapado se aplica automáticamente según el estándar: una contraseña como `coffee;2026` no parte el código en dos. Lo mismo vale para los acentos y la eñe en el nombre de la red: se codifican en UTF-8 y los teléfonos los leen sin problema.",
        ],
      },
      {
        heading: "Dónde colocarlo",
        paragraphs: [
          "El mostrador de recepción, una mesa de la cafetería, la sala de reuniones, la red de invitados de casa para los amigos, la zona de espera de un salón. Conviene colgarlo junto a un enchufe o en un lugar visible cerca de la entrada, donde la persona ya tiene el móvil en la mano.",
          "Para artes gráficas, usa SVG: no se pixela al ampliarlo y se imprime en cualquier tamaño. Para una pantalla o un mensajero basta con PNG. El lado mínimo del código ronda los 2 centímetros impresos; por debajo, la cámara no distingue los módulos.",
        ],
      },
      {
        heading: "Lo que conviene tener en cuenta",
        paragraphs: [
          "El código QR no cifra la contraseña: cualquiera que lo vea obtiene acceso a la red. Así que no cuelgues el de la red principal: crea un SSID de invitados aparte, que puedas cambiar con un clic sin reconfigurar los equipos de trabajo.",
          "Y no des a la red de invitados acceso a los recursos locales: impresoras, NAS, cámaras. El QR resuelve lo de «conectarse rápido», no lo de «conectarse de forma segura».",
        ],
      },
    ],
    faq: [
      {
        q: "¿Hace falta internet para conectarse con este código?",
        a: "No. Los datos de la red van dentro del propio código y el teléfono no necesita descargar nada. La conexión a internet llega después de unirse a la red.",
      },
      {
        q: "¿Y si hay que cambiar la contraseña?",
        a: "Un código estático hay que volver a imprimirlo. Por eso la red de invitados se monta aparte: cambiar su contraseña sale más barato que rehacer los carteles de todo el local.",
      },
      {
        q: "¿Por qué la cámara ve el código pero no ofrece conectarse?",
        a: "Lo más frecuente es que falte el tipo de cifrado o que sea incorrecto. La segunda causa es un código demasiado pequeño o dañado: el teléfono lee la dirección, pero no interpreta la cadena WIFI:. Comprueba el código con un escáner antes de imprimir.",
      },
      {
        q: "¿Puedo hacer un solo código para varias redes?",
        a: "No: un código, una red. Para dos redes hacen falta dos códigos o una página de instrucciones con un enlace.",
      },
    ],
    cta: "Crear un código para Wi-Fi",
    ctaHref: "/?type=wifi",
  },
  {
    slug: "codigo-qr-con-logo",
    title: "Código QR con logo: la marca dentro del código",
    description:
      "Cómo hacer un QR con logo sin perder legibilidad: recortar módulos, la corrección de errores, el tamaño máximo del logo y el vector en SVG.",
    h1: "Código QR con logo: la marca dentro del código, no encima",
    lede: "El logo no va pegado encima: los módulos que quedan debajo se recortan, alrededor se deja un margen limpio y el código sigue leyéndose en el escáner.",
    demo: {
      value: "https://qr-ix.com/",
      label: "Enlace al generador: el logo se recorta de los módulos, no se superpone",
    },
    sections: [
      {
        heading: "Por qué no basta con superponer una imagen",
        paragraphs: [
          "Un código QR es una cuadrícula de módulos en la que cada cuadrado lleva bits de datos e información de servicio. Si tapas parte de los módulos con una imagen, pierdes datos. La corrección de errores ayuda: con el nivel H el código sobrevive a la pérdida de hasta el 30 % de la superficie, pero a ciegas es fácil cruzar el límite, sobre todo en enlaces cortos, donde hay menos módulos.",
          "Por eso lo de «poner el logo en el centro desde el editor» es una lotería. Unas veces se lee y otras no, y normalmente se descubre con la tirada ya impresa.",
        ],
      },
      {
        heading: "Cómo lo resuelve Qrix",
        paragraphs: [
          "Los módulos que quedan bajo el logo no se tapan: se recortan del código y el dibujo de alrededor se recalcula con un margen limpio. Si cambias el tamaño, el margen o el redondeo, la zona recortada se recalcula con ellos.",
          "Si el logo se hace demasiado grande para el nivel de corrección elegido, la interfaz avisa antes de exportar, no después. No es una garantía para todos los escáneres del mundo, pero elimina la forma más habitual de estropear un código.",
        ],
      },
      {
        heading: "Tamaño y corrección de errores",
        paragraphs: [
          "Mantén el logo en torno a un cuarto de la superficie del código y usa la corrección H. Mejor un logo con contraste y sin detalles finos: en una pantalla pequeña o en un escáner barato las líneas delgadas se funden.",
          "Comprueba siempre el código final en dos o tres móviles y con poca luz. Un código bonito que no se lee en la calle es solo una imagen.",
        ],
      },
      {
        heading: "El logo sigue siendo vector",
        paragraphs: [
          "Un logo en SVG se incrusta en el archivo con trazos reales, no como una capa de mapa de bits. En Figma e Illustrator ese código se abre como vector: se puede ampliar hasta el tamaño de un rótulo sin perder calidad.",
          "El logo se carga desde tu archivo y se procesa en el navegador: no viaja a ningún servidor. Esto importa si el logo contiene una marca aún sin publicar o derechos de terceros.",
        ],
      },
    ],
    faq: [
      {
        q: "¿Qué tamaño puede tener el logo?",
        a: "El límite práctico ronda un cuarto de la superficie del código con corrección H. A partir de ahí crece el riesgo de que un escáner barato no dé con él, sobre todo si el enlace es corto.",
      },
      {
        q: "¿Hay que usar la corrección H obligatoriamente?",
        a: "En un código con logo, sí: es el mínimo razonable. H recupera hasta el 30 % de la superficie dañada; Q, hasta el 25 %.",
      },
      {
        q: "¿Puedo subir mi propio logo?",
        a: "Sí, en PNG o SVG de hasta 1 MB. El archivo se procesa localmente en el navegador y no se envía a ninguna parte.",
      },
      {
        q: "¿Qué hago si el código con logo no se lee?",
        a: "Reduce el logo, amplía los márgenes alrededor del código y sube la corrección a H. Si aun así falla, quita la forma decorativa de los módulos: también consume superficie.",
      },
    ],
    cta: "Añadir un logo al código",
    ctaHref: "/",
  },
  {
    slug: "codigo-qr-bitcoin",
    title: "Código QR para bitcoin: dirección, importe y etiqueta",
    description:
      "QR para cobrar en bitcoin según BIP-21: dirección, importe, etiqueta y mensaje. Cómo rellena el monedero el importe y por qué la precisión importa.",
    h1: "Código QR para bitcoin: dirección, importe y etiqueta con BIP-21",
    lede: "El monedero rellena la dirección y el importe por sí solo: quien paga no teclea la dirección a mano ni se equivoca en la cantidad de ceros.",
    demo: {
      value: "bitcoin:bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq?amount=0.015&label=Coffee%20Lab",
      label: "Dirección, importe de 0.015 BTC y etiqueta del destinatario, según el estándar BIP-21",
    },
    sections: [
      {
        heading: "Qué lleva dentro el código",
        paragraphs: [
          "Una solicitud de pago en bitcoin se describe con el estándar BIP-21: el esquema bitcoin:, la dirección y, tras el signo de interrogación, los parámetros. `amount` fija el importe, `label` el nombre del destinatario y `message` un texto libre que verá quien paga.",
          "El importe se indica en BTC como fracción decimal, no en satoshi. Es una fuente frecuente de confusión: un código montado «a ojo» pide un importe cien millones de veces mayor o menor.",
        ],
      },
      {
        heading: "La precisión del importe",
        paragraphs: [
          "0.015 BTC no se representa de forma exacta en coma flotante binaria, así que un cálculo ingenuo devuelve 0.01499999. En Qrix el importe se convierte mediante BigInt y al código llega exactamente lo que has introducido.",
          "En cripto esto no es pedantería: una diferencia de un satoshi significa que el monedero mostrará un importe distinto del acordado y el pago habrá que cuadrarlo a mano.",
        ],
      },
      {
        heading: "Cada red tiene su esquema",
        paragraphs: [
          "Bitcoin, Litecoin y Dogecoin usan BIP-21. Ethereum usa ERC-681, donde el importe se calcula en wei. Solana usa Solana Pay y TON su propio esquema en nanotonos. No hay una fórmula universal de «dirección e importe»: por eso los códigos de servicios que aplican una misma plantilla a todo a menudo no rellenan el importe.",
          "Qrix construye el esquema de cada red por separado y valida el formato de la dirección: base58, bech32, hex. En tokens como USDT al código solo va la dirección: la red y el contrato los deduce el monedero.",
        ],
      },
      {
        heading: "Qué no resuelve el QR",
        paragraphs: [
          "El código contiene una dirección y un importe, y nada más. Las claves privadas no entran en él y la firma no se puede falsificar a través de un QR. Tampoco protege frente a la sustitución de la dirección: quien tenga acceso a tu maquetación puede cambiar el código entero.",
          "Por eso los primeros y los últimos caracteres de la dirección se siguen comparando a ojo, y en importes grandes se verifica la dirección dentro del propio monedero. El QR quita las erratas, pero no sustituye la atención.",
        ],
      },
    ],
    faq: [
      {
        q: "¿Se puede hacer un código sin importe?",
        a: "Sí. Así el monedero solo rellena la dirección y el importe lo escribe quien paga: viene bien para donaciones y propinas.",
      },
      {
        q: "¿Por qué el monedero abre la dirección pero no rellena el importe?",
        a: "Lo más probable es que el esquema no coincida con la red: por ejemplo, BIP-21 en una red que no lo admite, o un importe en satoshi en lugar de BTC.",
      },
      {
        q: "¿Es seguro publicar este código?",
        a: "Sí. En el código solo hay una dirección pública y un importe. Las claves privadas, la frase semilla y las contraseñas no entran nunca.",
      },
      {
        q: "¿Se admite Lightning?",
        a: "No. Los pagos relámpago usan un formato aparte, BOLT11; es otro esquema y un código de bitcoin normal no lo sustituye.",
      },
    ],
    cta: "Crear un código para bitcoin",
    ctaHref: "/?type=crypto&coin=btc",
  },
  {
    slug: "codigo-qr-svg",
    title: "Código QR en SVG: un vector para imprimir",
    description:
      "Por qué para imprimir conviene SVG y no PNG: un trazado vectorial en lugar de cientos de capas, agujeros reales en los marcadores y texto en contornos.",
    h1: "Código QR en SVG: un solo vector para imprimir y maquetar",
    lede: "Todo el código es un único trazado vectorial. En Figma e Illustrator es un solo objeto que se amplía hasta el tamaño de un rótulo sin perder calidad.",
    demo: {
      value: "https://example.com/poster",
      label: "Enlace para una maqueta impresa: el código sigue siendo vector a cualquier tamaño",
    },
    sections: [
      {
        heading: "Por qué no PNG",
        paragraphs: [
          "El PNG es un mapa de bits: una cuadrícula de píxeles de tamaño fijo. En pantalla se ve bien, pero al ampliarlo en una maqueta o al imprimirlo los bordes de los módulos se emborronan y los elementos pequeños se funden. El escáner necesita límites nítidos, no suavizado.",
          "Para una tarjeta de visita o un folleto suele bastar un PNG de 1000 píxeles. Para una lona, un rótulo o un envase hace falta un vector: si no, la imprenta rechazará el archivo o imprimirá un borrón.",
        ],
      },
      {
        heading: "Un solo trazado en lugar de cientos de capas",
        paragraphs: [
          "En la exportación de Qrix los módulos, los contornos de los marcadores y los núcleos se agrupan en un único elemento `path` con la regla de relleno `nonzero`. Los contornos interiores de los marcadores van en sentido antihorario y producen agujeros reales, no parches blancos.",
          "La diferencia práctica: en Illustrator y Figma ese archivo se abre como un solo objeto. Se puede pintar, escalar y colocar sobre la maqueta sin desmontar cientos de cuadrados sueltos.",
        ],
      },
      {
        heading: "Requisitos de impresión",
        paragraphs: [
          "Deja una zona de silencio alrededor del código: cuatro módulos como mínimo y mejor más. No imprimas sobre brillo, foil ni fondo oscuro: los reflejos y el poco contraste matan la lectura antes que los errores en los datos.",
          "El tamaño mínimo en papel ronda los 2 centímetros de lado, y para enlaces largos, más. Comprueba la maqueta en una impresora real y escanea desde la distancia a la que la gente lo va a escanear.",
        ],
      },
      {
        heading: "El pie de texto sigue siendo vector",
        paragraphs: [
          "Si activas el pie de texto bajo el código, el texto se convierte en contornos de su propia tipografía. En la maqueta no lo sustituirá una fuente del sistema ni se desplazará al abrirlo en otra máquina, que es justo lo que suele pasar con las capas de texto en archivos ajenos.",
          "El pie queda fuera de la zona de silencio del símbolo, así que según el estándar no afecta a la lectura.",
        ],
      },
    ],
    faq: [
      {
        q: "¿Qué resolución debe tener entonces el PNG?",
        a: "Para imprimir, no bajes de 1000 píxeles de lado y comprueba el tamaño físico: 300 dpi para 5 centímetros son unos 590 píxeles.",
      },
      {
        q: "¿Se puede obtener CMYK?",
        a: "El SVG guarda el color en RGB. Para la imprenta, convierte en la maqueta o al exportar a PDF: mejor hacer la conversión una sola vez y comprobarla en una prueba de impresión.",
      },
      {
        q: "¿Hace falta sangrado?",
        a: "Si el código queda cerca del borde, sí: añade sangrado en la maqueta. Pero conviene mantener el código lejos de la línea de corte para que no lo recorten.",
      },
      {
        q: "¿Sirve el SVG para bordado o grabado?",
        a: "Para grabado suele servir si los contornos son nítidos. Para bordado hace falta otra preparación: los módulos finos se pierden en la puntada, así que conviene ampliar el código y simplificar la forma.",
      },
    ],
    cta: "Descargar el código en SVG",
    ctaHref: "/",
  },
];

export const es: LandingBundle = { chrome, pages };
