export interface LangDef {
  code: string;
  name: string; // in its own language
  flag: string;
  countries: { code: string; name: string; flag: string }[];
}

export const ALL_LANGUAGES: LangDef[] = [
  {
    code: "en", name: "English", flag: "🇬🇧",
    countries: [
      { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
      { code: "US", name: "United States", flag: "🇺🇸" },
      { code: "IE", name: "Ireland", flag: "🇮🇪" },
      { code: "AU", name: "Australia", flag: "🇦🇺" },
      { code: "CA", name: "Canada", flag: "🇨🇦" },
      { code: "NZ", name: "New Zealand", flag: "🇳🇿" },
    ],
  },
  {
    code: "es", name: "Español", flag: "🇪🇸",
    countries: [
      { code: "ES", name: "España", flag: "🇪🇸" },
      { code: "MX", name: "México", flag: "🇲🇽" },
      { code: "AR", name: "Argentina", flag: "🇦🇷" },
      { code: "CO", name: "Colombia", flag: "🇨🇴" },
      { code: "CL", name: "Chile", flag: "🇨🇱" },
      { code: "PE", name: "Perú", flag: "🇵🇪" },
      { code: "EC", name: "Ecuador", flag: "🇪🇨" },
      { code: "VE", name: "Venezuela", flag: "🇻🇪" },
      { code: "UY", name: "Uruguay", flag: "🇺🇾" },
      { code: "CR", name: "Costa Rica", flag: "🇨🇷" },
    ],
  },
  {
    code: "pl", name: "Polski", flag: "🇵🇱",
    countries: [
      { code: "PL", name: "Polska", flag: "🇵🇱" },
    ],
  },
  {
    code: "de", name: "Deutsch", flag: "🇩🇪",
    countries: [
      { code: "DE", name: "Deutschland", flag: "🇩🇪" },
      { code: "AT", name: "Österreich", flag: "🇦🇹" },
      { code: "CH", name: "Schweiz", flag: "🇨🇭" },
      { code: "LI", name: "Liechtenstein", flag: "🇱🇮" },
      { code: "LU", name: "Luxemburg", flag: "🇱🇺" },
    ],
  },
  {
    code: "fr", name: "Français", flag: "🇫🇷",
    countries: [
      { code: "FR", name: "France", flag: "🇫🇷" },
      { code: "BE", name: "Belgique", flag: "🇧🇪" },
      { code: "CH", name: "Suisse", flag: "🇨🇭" },
      { code: "LU", name: "Luxembourg", flag: "🇱🇺" },
      { code: "MC", name: "Monaco", flag: "🇲🇨" },
      { code: "SN", name: "Sénégal", flag: "🇸🇳" },
      { code: "CI", name: "Côte d'Ivoire", flag: "🇨🇮" },
      { code: "CA", name: "Canada (QC)", flag: "🇨🇦" },
    ],
  },
  {
    code: "it", name: "Italiano", flag: "🇮🇹",
    countries: [
      { code: "IT", name: "Italia", flag: "🇮🇹" },
      { code: "CH", name: "Svizzera", flag: "🇨🇭" },
      { code: "SM", name: "San Marino", flag: "🇸🇲" },
    ],
  },
  {
    code: "pt", name: "Português", flag: "🇵🇹",
    countries: [
      { code: "PT", name: "Portugal", flag: "🇵🇹" },
      { code: "BR", name: "Brasil", flag: "🇧🇷" },
      { code: "AO", name: "Angola", flag: "🇦🇴" },
      { code: "MZ", name: "Moçambique", flag: "🇲🇿" },
    ],
  },
  {
    code: "nl", name: "Nederlands", flag: "🇳🇱",
    countries: [
      { code: "NL", name: "Nederland", flag: "🇳🇱" },
      { code: "BE", name: "België", flag: "🇧🇪" },
    ],
  },
  {
    code: "ru", name: "Русский", flag: "🇷🇺",
    countries: [
      { code: "RU", name: "Россия", flag: "🇷🇺" },
      { code: "BY", name: "Беларусь", flag: "🇧🇾" },
      { code: "KZ", name: "Казахстан", flag: "🇰🇿" },
    ],
  },
  {
    code: "uk", name: "Українська", flag: "🇺🇦",
    countries: [
      { code: "UA", name: "Україна", flag: "🇺🇦" },
    ],
  },
  {
    code: "sv", name: "Svenska", flag: "🇸🇪",
    countries: [
      { code: "SE", name: "Sverige", flag: "🇸🇪" },
      { code: "FI", name: "Finland", flag: "🇫🇮" },
    ],
  },
  {
    code: "no", name: "Norsk", flag: "🇳🇴",
    countries: [
      { code: "NO", name: "Norge", flag: "🇳🇴" },
    ],
  },
  {
    code: "da", name: "Dansk", flag: "🇩🇰",
    countries: [
      { code: "DK", name: "Danmark", flag: "🇩🇰" },
    ],
  },
  {
    code: "fi", name: "Suomi", flag: "🇫🇮",
    countries: [
      { code: "FI", name: "Suomi", flag: "🇫🇮" },
    ],
  },
  {
    code: "cs", name: "Čeština", flag: "🇨🇿",
    countries: [
      { code: "CZ", name: "Česko", flag: "🇨🇿" },
    ],
  },
  {
    code: "sk", name: "Slovenčina", flag: "🇸🇰",
    countries: [
      { code: "SK", name: "Slovensko", flag: "🇸🇰" },
    ],
  },
  {
    code: "hu", name: "Magyar", flag: "🇭🇺",
    countries: [
      { code: "HU", name: "Magyarország", flag: "🇭🇺" },
    ],
  },
  {
    code: "ro", name: "Română", flag: "🇷🇴",
    countries: [
      { code: "RO", name: "România", flag: "🇷🇴" },
      { code: "MD", name: "Moldova", flag: "🇲🇩" },
    ],
  },
  {
    code: "hr", name: "Hrvatski", flag: "🇭🇷",
    countries: [
      { code: "HR", name: "Hrvatska", flag: "🇭🇷" },
    ],
  },
  {
    code: "sr", name: "Српски", flag: "🇷🇸",
    countries: [
      { code: "RS", name: "Србија", flag: "🇷🇸" },
    ],
  },
  {
    code: "bg", name: "Български", flag: "🇧🇬",
    countries: [
      { code: "BG", name: "България", flag: "🇧🇬" },
    ],
  },
  {
    code: "sl", name: "Slovenščina", flag: "🇸🇮",
    countries: [
      { code: "SI", name: "Slovenija", flag: "🇸🇮" },
    ],
  },
  {
    code: "et", name: "Eesti", flag: "🇪🇪",
    countries: [
      { code: "EE", name: "Eesti", flag: "🇪🇪" },
    ],
  },
  {
    code: "lv", name: "Latviešu", flag: "🇱🇻",
    countries: [
      { code: "LV", name: "Latvija", flag: "🇱🇻" },
    ],
  },
  {
    code: "lt", name: "Lietuvių", flag: "🇱🇹",
    countries: [
      { code: "LT", name: "Lietuva", flag: "🇱🇹" },
    ],
  },
  {
    code: "el", name: "Ελληνικά", flag: "🇬🇷",
    countries: [
      { code: "GR", name: "Ελλάδα", flag: "🇬🇷" },
      { code: "CY", name: "Κύπρος", flag: "🇨🇾" },
    ],
  },
  {
    code: "tr", name: "Türkçe", flag: "🇹🇷",
    countries: [
      { code: "TR", name: "Türkiye", flag: "🇹🇷" },
      { code: "CY", name: "Kıbrıs", flag: "🇨🇾" },
    ],
  },
  {
    code: "ja", name: "日本語", flag: "🇯🇵",
    countries: [
      { code: "JP", name: "日本", flag: "🇯🇵" },
    ],
  },
  {
    code: "ko", name: "한국어", flag: "🇰🇷",
    countries: [
      { code: "KR", name: "대한민국", flag: "🇰🇷" },
    ],
  },
  {
    code: "zh", name: "中文", flag: "🇨🇳",
    countries: [
      { code: "CN", name: "中国", flag: "🇨🇳" },
      { code: "TW", name: "台灣", flag: "🇹🇼" },
      { code: "SG", name: "新加坡", flag: "🇸🇬" },
      { code: "HK", name: "香港", flag: "🇭🇰" },
    ],
  },
  {
    code: "hi", name: "हिन्दी", flag: "🇮🇳",
    countries: [
      { code: "IN", name: "भारत", flag: "🇮🇳" },
    ],
  },
  {
    code: "ar", name: "العربية", flag: "🇸🇦",
    countries: [
      { code: "SA", name: "السعودية", flag: "🇸🇦" },
      { code: "EG", name: "مصر", flag: "🇪🇬" },
      { code: "AE", name: "الإمارات", flag: "🇦🇪" },
      { code: "MA", name: "المغرب", flag: "🇲🇦" },
      { code: "DZ", name: "الجزائر", flag: "🇩🇿" },
      { code: "TN", name: "تونس", flag: "🇹🇳" },
      { code: "JO", name: "الأردن", flag: "🇯🇴" },
      { code: "LB", name: "لبنان", flag: "🇱🇧" },
      { code: "IQ", name: "العراق", flag: "🇮🇶" },
      { code: "SY", name: "سوريا", flag: "🇸🇾" },
    ],
  },
  {
    code: "fa", name: "فارسی", flag: "🇮🇷",
    countries: [
      { code: "IR", name: "ایران", flag: "🇮🇷" },
      { code: "AF", name: "افغانستان", flag: "🇦🇫" },
    ],
  },
  {
    code: "he", name: "עברית", flag: "🇮🇱",
    countries: [
      { code: "IL", name: "ישראל", flag: "🇮🇱" },
    ],
  },
  {
    code: "bn", name: "বাংলা", flag: "🇧🇩",
    countries: [
      { code: "BD", name: "বাংলাদেশ", flag: "🇧🇩" },
      { code: "IN", name: "ভারত", flag: "🇮🇳" },
    ],
  },
  {
    code: "ta", name: "தமிழ்", flag: "🇮🇳",
    countries: [
      { code: "IN", name: "இந்தியா", flag: "🇮🇳" },
      { code: "LK", name: "இலங்கை", flag: "🇱🇰" },
      { code: "SG", name: "சிங்கப்பூர்", flag: "🇸🇬" },
    ],
  },
  {
    code: "te", name: "తెలుగు", flag: "🇮🇳",
    countries: [
      { code: "IN", name: "భారతదేశం", flag: "🇮🇳" },
    ],
  },
  {
    code: "mr", name: "मराठी", flag: "🇮🇳",
    countries: [
      { code: "IN", name: "भारत", flag: "🇮🇳" },
    ],
  },
  {
    code: "ur", name: "اردو", flag: "🇵🇰",
    countries: [
      { code: "PK", name: "پاکستان", flag: "🇵🇰" },
      { code: "IN", name: "بھارت", flag: "🇮🇳" },
    ],
  },
  {
    code: "th", name: "ไทย", flag: "🇹🇭",
    countries: [
      { code: "TH", name: "ประเทศไทย", flag: "🇹🇭" },
    ],
  },
  {
    code: "vi", name: "Tiếng Việt", flag: "🇻🇳",
    countries: [
      { code: "VN", name: "Việt Nam", flag: "🇻🇳" },
    ],
  },
  {
    code: "id", name: "Bahasa Indonesia", flag: "🇮🇩",
    countries: [
      { code: "ID", name: "Indonesia", flag: "🇮🇩" },
    ],
  },
  {
    code: "ms", name: "Bahasa Melayu", flag: "🇲🇾",
    countries: [
      { code: "MY", name: "Malaysia", flag: "🇲🇾" },
      { code: "SG", name: "Singapura", flag: "🇸🇬" },
      { code: "BN", name: "Brunei", flag: "🇧🇳" },
    ],
  },
  {
    code: "tl", name: "Filipino", flag: "🇵🇭",
    countries: [
      { code: "PH", name: "Pilipinas", flag: "🇵🇭" },
    ],
  },
  {
    code: "sw", name: "Kiswahili", flag: "🇰🇪",
    countries: [
      { code: "KE", name: "Kenya", flag: "🇰🇪" },
      { code: "TZ", name: "Tanzania", flag: "🇹🇿" },
      { code: "UG", name: "Uganda", flag: "🇺🇬" },
    ],
  },
  {
    code: "am", name: "አማርኛ", flag: "🇪🇹",
    countries: [
      { code: "ET", name: "ኢትዮጵያ", flag: "🇪🇹" },
    ],
  },
  {
    code: "ha", name: "Hausa", flag: "🇳🇬",
    countries: [
      { code: "NG", name: "Nijeriya", flag: "🇳🇬" },
      { code: "NE", name: "Nijar", flag: "🇳🇪" },
    ],
  },
  {
    code: "yo", name: "Yorùbá", flag: "🇳🇬",
    countries: [
      { code: "NG", name: "Nàìjíríà", flag: "🇳🇬" },
    ],
  },
  {
    code: "zu", name: "isiZulu", flag: "🇿🇦",
    countries: [
      { code: "ZA", name: "iNingizimu Afrika", flag: "🇿🇦" },
    ],
  },
  {
    code: "af", name: "Afrikaans", flag: "🇿🇦",
    countries: [
      { code: "ZA", name: "Suid-Afrika", flag: "🇿🇦" },
    ],
  },
  {
    code: "ka", name: "ქართული", flag: "🇬🇪",
    countries: [
      { code: "GE", name: "საქართველო", flag: "🇬🇪" },
    ],
  },
  {
    code: "hy", name: "Հայերեն", flag: "🇦🇲",
    countries: [
      { code: "AM", name: "Հայաստան", flag: "🇦🇲" },
    ],
  },
  {
    code: "az", name: "Azərbaycan", flag: "🇦🇿",
    countries: [
      { code: "AZ", name: "Azərbaycan", flag: "🇦🇿" },
    ],
  },
  {
    code: "kk", name: "Қазақша", flag: "🇰🇿",
    countries: [
      { code: "KZ", name: "Қазақстан", flag: "🇰🇿" },
    ],
  },
  {
    code: "uz", name: "Oʻzbekcha", flag: "🇺🇿",
    countries: [
      { code: "UZ", name: "Oʻzbekiston", flag: "🇺🇿" },
    ],
  },
  {
    code: "mn", name: "Монгол", flag: "🇲🇳",
    countries: [
      { code: "MN", name: "Монгол", flag: "🇲🇳" },
    ],
  },
  {
    code: "my", name: "မြန်မာ", flag: "🇲🇲",
    countries: [
      { code: "MM", name: "မြန်မာ", flag: "🇲🇲" },
    ],
  },
  {
    code: "km", name: "ខ្មែរ", flag: "🇰🇭",
    countries: [
      { code: "KH", name: "កម្ពុជា", flag: "🇰🇭" },
    ],
  },
  {
    code: "lo", name: "ລາວ", flag: "🇱🇦",
    countries: [
      { code: "LA", name: "ລາວ", flag: "🇱🇦" },
    ],
  },
  {
    code: "ne", name: "नेपाली", flag: "🇳🇵",
    countries: [
      { code: "NP", name: "नेपाल", flag: "🇳🇵" },
    ],
  },
  {
    code: "si", name: "සිංහල", flag: "🇱🇰",
    countries: [
      { code: "LK", name: "ශ්‍රී ලංකාව", flag: "🇱🇰" },
    ],
  },
  {
    code: "ca", name: "Català", flag: "🇪🇸",
    countries: [
      { code: "ES", name: "Espanya", flag: "🇪🇸" },
      { code: "AD", name: "Andorra", flag: "🇦🇩" },
    ],
  },
  {
    code: "eu", name: "Euskara", flag: "🇪🇸",
    countries: [
      { code: "ES", name: "Espainia", flag: "🇪🇸" },
    ],
  },
  {
    code: "gl", name: "Galego", flag: "🇪🇸",
    countries: [
      { code: "ES", name: "España", flag: "🇪🇸" },
    ],
  },
  {
    code: "is", name: "Íslenska", flag: "🇮🇸",
    countries: [
      { code: "IS", name: "Ísland", flag: "🇮🇸" },
    ],
  },
  {
    code: "ga", name: "Gaeilge", flag: "🇮🇪",
    countries: [
      { code: "IE", name: "Éire", flag: "🇮🇪" },
    ],
  },
  {
    code: "cy", name: "Cymraeg", flag: "🏴󠁧󠁢󠁷󠁬󠁳󠁿",
    countries: [
      { code: "GB", name: "Y Deyrnas Unedig", flag: "🇬🇧" },
    ],
  },
  {
    code: "sq", name: "Shqip", flag: "🇦🇱",
    countries: [
      { code: "AL", name: "Shqipëria", flag: "🇦🇱" },
      { code: "XK", name: "Kosova", flag: "🇽🇰" },
    ],
  },
  {
    code: "mk", name: "Македонски", flag: "🇲🇰",
    countries: [
      { code: "MK", name: "Северна Македонија", flag: "🇲🇰" },
    ],
  },
  {
    code: "bs", name: "Bosanski", flag: "🇧🇦",
    countries: [
      { code: "BA", name: "Bosna i Hercegovina", flag: "🇧🇦" },
    ],
  },
  {
    code: "mt", name: "Malti", flag: "🇲🇹",
    countries: [
      { code: "MT", name: "Malta", flag: "🇲🇹" },
    ],
  },
];
