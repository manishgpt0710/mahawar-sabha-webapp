export const locations = {
  mathura: {
    slug: "mathura",
    name: "Mathura Sabha",
    city: "Mathura",
    tagline: "जहाँ संस्कार मिलते हैं, समाज बनता है",
    description: "A growing community platform for the Mahawar Sabha family in the sacred heartland of Braj.",
    phone: "+91 98765 43210",
    heroImage: "https://images.unsplash.com/photo-1615885108069-7d5bef9a7e22?auto=format&fit=crop&w=1800&q=85",
    stats: ["25+", "Years of togetherness"],
    highlights: ["Community gatherings", "Youth & education", "Cultural heritage"],
  },
  rewari: {
    slug: "rewari",
    name: "Rewari Sabha",
    city: "Rewari",
    tagline: "अपनापन, सेवा और साथ",
    description: "A warm local home for Mahawar families, shared traditions, and meaningful community service.",
    phone: "+91 98765 43211",
    heroImage: "https://images.unsplash.com/photo-1519955266818-0231b63402bc?auto=format&fit=crop&w=1800&q=85",
    stats: ["18+", "Years of togetherness"],
    highlights: ["Family meets", "Community care", "Living traditions"],
  },
};

export const copy = {
  en: {
    nav: ["Home", "About us", "Our work", "Contact"],
    home: "Home",
    about: "About us",
    welcome: "Welcome to Mahawar Sabha",
    eyebrow: "A community rooted in values",
    cta: "Explore our Sabha",
    storyCta: "Read our story",
    aboutTitle: "A shared heritage, carried forward together.",
    aboutBody: "Mahawar Sabha brings families together through culture, care, and a commitment to the generations ahead. Our doors are open to every voice and every story.",
    pillars: "What brings us together",
    admin: "Admin space",
    journal: "Journal",
    switch: "Your Sabha",
    locationNote: "Showing the local experience for",
    footer: "Rooted in community. Growing with purpose.",
    language: "हिन्दी",
  },
  hi: {
    nav: ["मुख्य पृष्ठ", "हमारे बारे में", "हमारे कार्य", "संपर्क"],
    home: "मुख्य पृष्ठ",
    about: "हमारे बारे में",
    welcome: "महावर सभा में आपका स्वागत है",
    eyebrow: "मूल्यों से जुड़ा एक समाज",
    cta: "सभा को जानें",
    storyCta: "हमारी कहानी पढ़ें",
    aboutTitle: "साझी विरासत, जिसे हम साथ लेकर आगे बढ़ाते हैं।",
    aboutBody: "महावर सभा संस्कृति, सेवा और आने वाली पीढ़ियों के प्रति जिम्मेदारी के माध्यम से परिवारों को जोड़ती है। हर आवाज़ और हर कहानी के लिए हमारे द्वार खुले हैं।",
    pillars: "हमें जोड़ने वाली बातें",
    admin: "व्यवस्थापक क्षेत्र",
    journal: "कहानियाँ",
    switch: "आपकी सभा",
    locationNote: "आपके लिए स्थानीय अनुभव",
    footer: "समाज में जड़ें। उद्देश्य के साथ विकास।",
    language: "English",
  },
};

export function resolveLocation() {
  const host = window.location.hostname.toLowerCase();
  const subdomain = host.split(".")[0];
  const routeSlug = window.location.pathname.split("/")[1];
  return locations[subdomain] || locations[routeSlug] || locations.mathura;
}