export const CATEGORY_NAMES = [
  "Animals",
  "Food",
  "Travel",
  "Airport",
  "Nature",
  "Sports",
  "School",
  "Technology",
  "Household Objects",
  "Vehicles",
  "Countries",
  "Jobs",
  "Space",
  "Weather",
  "Mixed Words",
];

export const CATEGORY_HINTS = {
  Animals: "A living creature from land, air, or water.",
  Food: "Something people eat, cook, or serve.",
  Travel: "A word connected to trips and journeys.",
  Airport: "A word from the airport or flying world.",
  Nature: "A word from plants, land, water, or wildlife spaces.",
  Sports: "A word connected to games, teams, or exercise.",
  School: "A word from learning, classes, or school supplies.",
  Technology: "A word from computers, gadgets, or modern tools.",
  "Household Objects": "An everyday item found at home.",
  Vehicles: "A way to move people or things.",
  Countries: "A country somewhere in the world.",
  Jobs: "A person who does this work.",
  Space: "A word connected to the sky beyond Earth.",
  Weather: "A word connected to conditions in the sky.",
  "Mixed Words": "A friendly everyday word from a mixed set.",
};

const BANK = {
  Animals: {
    easy: ["CAT", "DOG", "FOX", "BEAR", "LION", "WOLF", "DEER", "GOAT", "FROG", "DUCK", "SEAL", "CRAB"],
    normal: ["PANDA", "ZEBRA", "HORSE", "RABBIT", "MONKEY", "TURTLE", "DOLPHIN", "EAGLE", "FALCON", "PARROT", "PENGUIN", "GIRAFFE", "CHEETAH", "HAMSTER"],
    hard: ["ELEPHANT", "KANGAROO", "LEOPARD", "OCTOPUS", "SQUIRREL", "GORILLA", "FLAMINGO", "CROCODILE", "CHAMELEON", "BUTTERFLY", "DRAGONFLY", "WOODPECKER", "PORCUPINE", "NIGHTINGALE"],
  },
  Food: {
    easy: ["RICE", "SOUP", "CAKE", "BREAD", "APPLE", "PASTA", "SALAD", "PIZZA", "MANGO", "TACOS", "CURRY", "JUICE"],
    normal: ["BURGER", "NOODLES", "PANCAKE", "WAFFLE", "YOGURT", "BISCUIT", "CHUTNEY", "SANDWICH", "POPCORN", "OMELETTE", "PUDDING", "CUPCAKE", "LASAGNA", "SAMOSA"],
    hard: ["BUTTERSCOTCH", "PINEAPPLE", "STRAWBERRY", "BLUEBERRY", "CHOCOLATE", "GUACAMOLE", "CROISSANT", "MOZZARELLA", "VEGETABLES", "CINNAMON", "RASPBERRY", "MACARONI", "FALAFEL", "TIRAMISU"],
  },
  Travel: {
    easy: ["MAP", "BAG", "TRIP", "TAXI", "HOTEL", "TRAIN", "COACH", "BEACH", "GUIDE", "TICKET", "ROUTE", "CABIN"],
    normal: ["PASSPORT", "JOURNEY", "LUGGAGE", "ARRIVAL", "DEPART", "ISLAND", "CRUISE", "STATION", "TOURIST", "HOSTEL", "CHECKIN", "ITINERARY", "BORDER", "VOYAGE"],
    hard: ["ADVENTURE", "DESTINATION", "BACKPACKER", "SIGHTSEEING", "RESERVATION", "EXPEDITION", "MOUNTAIN PASS", "TRAVELER'S MAP", "ROADTRIP", "BOARDING PASS", "LANDMARKS", "HOMESTAY", "WAYFINDER", "POSTCARD"],
  },
  Airport: {
    easy: ["GATE", "WING", "CREW", "SEAT", "TAG", "RUNWAY", "PLANE", "PILOT", "CARGO", "TOWER", "CABIN", "RADAR"],
    normal: ["AIRPORT", "BOARDING", "HANGAR", "TERMINAL", "SECURITY", "CUSTOMS", "JETWAY", "TAKEOFF", "LANDING", "CHECKLIST", "AIRLINE", "LAYOVER", "TROLLEY", "PASSPORT"],
    hard: ["DEPARTURE", "NAVIGATION", "TURBULENCE", "CONTROL TOWER", "FLIGHT CREW", "BOARDING GROUP", "PILOT'S LOG", "BAGGAGE CLAIM", "RUNWAY LIGHTS", "OVERHEAD BIN", "AIR TRAFFIC", "FINAL APPROACH", "GROUND CREW", "JET BRIDGE"],
  },
  Nature: {
    easy: ["TREE", "LEAF", "ROCK", "LAKE", "RIVER", "HILL", "GRASS", "FLOWER", "CLOUD", "FOREST", "OCEAN", "FIELD"],
    normal: ["VALLEY", "DESERT", "MEADOW", "ISLAND", "CANYON", "WATERFALL", "RAINBOW", "SUNRISE", "BLOSSOM", "JUNGLE", "GLACIER", "VOLCANO", "ORCHARD", "STREAM"],
    hard: ["MANGROVE", "RAINFOREST", "PENINSULA", "WILDERNESS", "MOUNTAINS", "CORAL REEF", "EVERGREEN", "SAND DUNES", "LAGOON", "MARSHLAND", "SNOWFIELD", "SEASHORE", "POLLINATION", "CONSTELLATION"],
  },
  Sports: {
    easy: ["BALL", "GOAL", "TEAM", "RACE", "SWIM", "BOXING", "TENNIS", "SOCCER", "RUGBY", "HOCKEY", "SKATE", "TRACK"],
    normal: ["BASKET", "RUNNER", "CYCLING", "ARCHERY", "BOWLING", "VOLLEY", "BADMINTON", "BASEBALL", "FOOTBALL", "SPRINTER", "STADIUM", "REFEREE", "TRAINER", "SURFING"],
    hard: ["GYMNASTICS", "TOURNAMENT", "MARATHON", "SKATEBOARD", "WATER POLO", "TABLE TENNIS", "ROCK CLIMBING", "SNOWBOARD", "PENTATHLON", "TRIATHLON", "GOALKEEPER", "CHAMPIONSHIP", "PARAGLIDING", "WEIGHTLIFTING"],
  },
  School: {
    easy: ["BOOK", "DESK", "PEN", "QUIZ", "CLASS", "PAPER", "BOARD", "LUNCH", "MATH", "ART", "MUSIC", "SPORT"],
    normal: ["LIBRARY", "TEACHER", "STUDENT", "SCIENCE", "HISTORY", "GEOGRAPHY", "PROJECT", "NOTEBOOK", "CRAYONS", "BACKPACK", "CALENDAR", "ASSEMBLY", "LESSON", "HOMEWORK"],
    hard: ["CLASSROOM", "DICTIONARY", "LABORATORY", "EXAMINATION", "GRADUATION", "MICROSCOPE", "CALCULATOR", "BLACKBOARD", "SCHOLARSHIP", "ATTENDANCE", "PUNCTUATION", "TEACHER'S DESK", "LANGUAGE ARTS", "SPELLING BEE"],
  },
  Technology: {
    easy: ["CODE", "APP", "MOUSE", "SCREEN", "ROBOT", "PHONE", "EMAIL", "DRONE", "PIXEL", "LASER", "RADIO", "CABLE"],
    normal: ["LAPTOP", "TABLET", "CAMERA", "PRINTER", "SENSOR", "NETWORK", "BROWSER", "KEYBOARD", "MONITOR", "CHARGER", "SOFTWARE", "WEBSITE", "DATABASE", "WIRELESS"],
    hard: ["ALGORITHM", "SATELLITE", "MICROCHIP", "PASSWORD", "BLUETOOTH", "FIREWALL", "PROCESSOR", "SMARTWATCH", "HEADPHONES", "TOUCHSCREEN", "ARTIFICIAL", "FIBER OPTIC", "CLOUD STORAGE", "MOTHERBOARD"],
  },
  "Household Objects": {
    easy: ["CUP", "LAMP", "CHAIR", "TABLE", "CLOCK", "PLATE", "SPOON", "TOWEL", "BROOM", "PILLOW", "MIRROR", "SHELF"],
    normal: ["BLANKET", "CURTAIN", "KETTLE", "TOASTER", "DRAWER", "CUSHION", "CABINET", "BOTTLE", "HAMMER", "LADDER", "MATTRESS", "UMBRELLA", "BASKET", "CHARGER"],
    hard: ["REFRIGERATOR", "MICROWAVE", "VACUUM", "BOOKSHELF", "WARDROBE", "DISHWASHER", "WALL CLOCK", "DOORBELL", "WASHING MACHINE", "DINING TABLE", "COFFEE MAKER", "FLOOR LAMP", "IRONING BOARD", "TOOLBOX"],
  },
  Vehicles: {
    easy: ["CAR", "BUS", "VAN", "BIKE", "BOAT", "TRAIN", "TRUCK", "SLED", "TAXI", "PLANE", "METRO", "JEEP"],
    normal: ["BICYCLE", "TRACTOR", "SAILBOAT", "SUBWAY", "AIRSHIP", "FERRY", "AMBULANCE", "FIRETRUCK", "MINIBUS", "CARRIAGE", "HELICOPTER", "GLIDER", "TRAMWAY", "KAYAK"],
    hard: ["MOTORCYCLE", "SKATEBOARD", "SNOWMOBILE", "BULLET TRAIN", "CARGO SHIP", "JET SKI", "MONORAIL", "HOT AIR BALLOON", "SPACE SHUTTLE", "DELIVERY VAN", "TOW TRUCK", "PICKUP TRUCK", "SEAPLANE", "DOUBLE DECKER"],
  },
  Countries: {
    easy: ["INDIA", "CHINA", "JAPAN", "SPAIN", "ITALY", "FRANCE", "BRAZIL", "CANADA", "MEXICO", "EGYPT", "KENYA", "CHILE"],
    normal: ["GERMANY", "IRELAND", "THAILAND", "VIETNAM", "MOROCCO", "NIGERIA", "SWEDEN", "NORWAY", "FINLAND", "POLAND", "GREECE", "TURKEY", "PORTUGAL", "AUSTRIA"],
    hard: ["AUSTRALIA", "ARGENTINA", "SINGAPORE", "INDONESIA", "PHILIPPINES", "SWITZERLAND", "NEW ZEALAND", "SOUTH KOREA", "COSTA RICA", "SOUTH AFRICA", "NETHERLANDS", "UNITED KINGDOM", "SAUDI ARABIA", "MADAGASCAR"],
  },
  Jobs: {
    easy: ["CHEF", "PILOT", "NURSE", "COACH", "BAKER", "FARMER", "SINGER", "DANCER", "DRIVER", "ARTIST", "GUARD", "CLERK"],
    normal: ["TEACHER", "DOCTOR", "DENTIST", "PLUMBER", "MECHANIC", "WRITER", "LAWYER", "LIBRARIAN", "SCIENTIST", "ENGINEER", "DESIGNER", "REPORTER", "GARDENER", "BARBER"],
    hard: ["ARCHITECT", "FIREFIGHTER", "PHOTOGRAPHER", "ELECTRICIAN", "PARAMEDIC", "ACCOUNTANT", "VETERINARIAN", "TRANSLATOR", "CARPENTER", "ASTRONAUT", "PROGRAMMER", "ATTENDANT", "CONTROLLER", "METEOROLOGIST"],
  },
  Space: {
    easy: ["SUN", "MOON", "STAR", "MARS", "VENUS", "COMET", "ORBIT", "ROCKET", "EARTH", "PLUTO", "ALIEN", "LASER"],
    normal: ["PLANET", "GALAXY", "METEOR", "ASTEROID", "NEBULA", "SATURN", "JUPITER", "ECLIPSE", "COSMOS", "ASTRONAUT", "TELESCOPE", "MISSION", "CRATER", "GRAVITY"],
    hard: ["SPACECRAFT", "CONSTELLATION", "OBSERVATORY", "SPACE STATION", "MILKY WAY", "BLACK HOLE", "SOLAR SYSTEM", "LUNAR ROVER", "METEOR SHOWER", "ATMOSPHERE", "INTERSTELLAR", "SATELLITE", "STARLIGHT", "EXOPLANET"],
  },
  Weather: {
    easy: ["RAIN", "SNOW", "WIND", "FOG", "SUNNY", "CLOUD", "STORM", "BREEZE", "HUMID", "FROST", "CHILL", "MIST"],
    normal: ["THUNDER", "LIGHTNING", "FORECAST", "RAINBOW", "CYCLONE", "MONSOON", "TORNADO", "BLIZZARD", "HAILSTONE", "MISTY", "OVERCAST", "SUNSHINE", "FREEZING", "SHOWERS"],
    hard: ["TEMPERATURE", "ATMOSPHERE", "BAROMETER", "HURRICANE", "CLOUD BURST", "HEAT WAVE", "WIND CHILL", "DUST STORM", "SNOWDRIFT", "PRECIPITATION", "WATERSPOUT", "JET STREAM", "MICROCLIMATE", "METEOROLOGY"],
  },
  "Mixed Words": {
    easy: ["SMILE", "HAPPY", "MUSIC", "DREAM", "BRAVE", "LIGHT", "MAGIC", "WATER", "GREEN", "BLOOM", "CANDY", "PARTY"],
    normal: ["BALLOON", "PUZZLE", "CASTLE", "GARDEN", "WINDOW", "MARKET", "BUTTON", "JOURNAL", "DIAMOND", "FESTIVAL", "TREASURE", "HARMONY", "SUNFLOWER", "ADVENTURE"],
    hard: ["FIREFLIES", "WONDERFUL", "NOTEBOOK", "CHAMPION", "RAINCOAT", "KINDNESS", "BLUEPRINT", "HORIZON", "MYSTERY BOX", "GOLDEN TICKET", "STORYTELLER", "CELEBRATION", "HIDE-AND-SEEK", "FRIEND'S NOTE"],
  },
};

export const PHRASES = [
  "BOARDING PASS",
  "WINDOW SEAT",
  "FASTEN SEATBELTS",
  "CLOUD NINE",
  "SUNNY DAY",
  "RUNWAY LIGHTS",
  "LOST LUGGAGE",
  "FINAL CALL",
  "GOOD MORNING",
  "FLIGHT CREW",
  "TRAVEL BAG",
  "HAPPY JOURNEY",
  "SCHOOL BUS",
  "RAINBOW SKY",
  "GREEN LIGHT",
  "STAR MAP",
  "PICNIC BASKET",
  "MUSIC CLASS",
  "TICKET COUNTER",
  "PILOT'S LOG",
  "ICE-CREAM",
  "FRIEND'S NOTE",
  "MOUNTAIN PASS",
  "SPACE STATION",
  "HOT AIR BALLOON",
  "AIR TRAFFIC",
  "BOARDING GROUP",
  "BAGGAGE CLAIM",
  "CONTROL TOWER",
  "TAKEOFF TIME",
];

function expandWordBank() {
  const entries = [];
  for (const [category, groups] of Object.entries(BANK)) {
    for (const [difficulty, words] of Object.entries(groups)) {
      for (const word of words) {
        entries.push({
          word,
          category,
          difficulty,
          hint: CATEGORY_HINTS[category],
          definition: `${wordTitle(word)} is connected to ${category.toLowerCase()}.`,
        });
      }
    }
  }
  return entries;
}

export const WORD_BANK = expandWordBank();

export function wordTitle(word) {
  return word
    .toLowerCase()
    .replace(/\b[a-z]/g, (letter) => letter.toUpperCase())
    .replace("'S", "'s");
}

export function letterCount(word) {
  return (word.match(/[A-Z]/gi) || []).length;
}

export function wordsForSetup({ category = "Mixed Words", difficulty = "normal", variation = "classic", recentWords = [] } = {}) {
  let pool = WORD_BANK;
  if (variation === "phrase") {
    pool = PHRASES.map((word) => ({
      word,
      category: "Travel",
      difficulty,
      hint: "A short friendly phrase.",
      definition: "A travel-friendly phrase.",
    }));
  } else if (category && category !== "Mixed Words") {
    pool = pool.filter((entry) => entry.category === category);
  }
  if (variation === "quick") {
    pool = pool.filter((entry) => letterCount(entry.word) <= 6);
  } else if (variation !== "phrase") {
    pool = pool.filter((entry) => entry.difficulty === difficulty);
  }
  const recent = new Set(recentWords || []);
  const fresh = pool.filter((entry) => !recent.has(entry.word));
  return fresh.length ? fresh : pool;
}

export function selectWord(setup) {
  const pool = wordsForSetup(setup);
  return pool[Math.floor(Math.random() * pool.length)] || WORD_BANK[0];
}

export function categoryOptions() {
  return CATEGORY_NAMES.map((name) => ({
    id: name,
    label: name,
    count: WORD_BANK.filter((entry) => entry.category === name).length,
  }));
}
