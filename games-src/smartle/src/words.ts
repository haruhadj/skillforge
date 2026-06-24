/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// A high-quality compiled list of common 5-letter English words for verification (dictionary)
export const VALID_WORDS = new Set([
  "ABOUT", "ABOVE", "ADMIT", "ADULT", "AFTER", "AGREE", "AHEAD", "AISLE", "ALARM", "ALBUM", "ALERT", "ALIKE", "ALIVE", "ALONE", "ALONG",
  "ALTER", "AMONG", "ANGER", "ANGLE", "ANGRY", "APART", "APPLE", "APPLY", "ARENA", "ARGUE", "ARISE", "ARRAY", "ARROW", "ASIDE", "ASSET",
  "AUDIO", "AUDIT", "AWAKE", "AWFUL", "BACON", "BADGE", "BAKER", "BASIC", "BASIN", "BASIS", "BEACH", "BEARD", "BEAST", "BEAUT", "BEGIN",
  "BEING", "BELOW", "BENCH", "BERRY", "BIBLE", "BIRCH", "BIRTH", "BLACK", "BLADE", "BLAME", "BLANK", "BLAST", "BLEND", "BLIND", "BLINK",
  "BLOCK", "BLOND", "BLOOD", "BLOOM", "BLOWN", "BOARD", "BOAST", "BOOST", "BOOTH", "BOUND", "BRAIN", "BRAKE", "BRAND", "BRASS", "BREAD",
  "BREAK", "BREED", "BRICK", "BRIDE", "BRIEF", "BRING", "BROAD", "BROKE", "BROWN", "BRUSH", "BUILD", "BUNCH", "BURNT", "BUYER", "CABIN",
  "CABLE", "CAMEL", "CANAL", "CANDY", "CARGO", "CARVE", "CATER", "CAUSE", "CELLO", "CHAIN", "CHAIR", "CHALK", "CHAMP", "CHANT", "CHAOS",
  "CHARM", "CHART", "CHASE", "CHEAP", "CHEAT", "CHECK", "CHEEK", "CHEER", "CHESS", "CHEST", "CHIEF", "CHILD", "CHIME", "CHIPS", "CHOIR",
  "CHOKE", "CHORD", "CHORE", "CHOSE", "CHUCK", "CHUTE", "CIDER", "CIGAR", "CLAIM", "CLANG", "CLASH", "CLASP", "CLASS", "CLEAN", "CLEAR",
  "CLEFT", "CLERK", "CLICK", "CLIFF", "CLIMB", "CLING", "CLINK", "CLOCK", "CLONE", "CLOSE", "CLOTH", "CLOUD", "CLOVE", "CLOWN", "CLUES",
  "COACH", "COAST", "COBRA", "COCOA", "CODEX", "COILS", "COINS", "CORAL", "COUCH", "COUNT", "COUPE", "COURT", "COVER", "CRACK", "CRAFT",
  "CRANE", "CRANK", "CRASH", "CRATE", "CRAWL", "CRAZY", "CREAM", "CREED", "CREEK", "CREEP", "CREST", "CRIED", "CRISP", "CRUST", "CUBIC",
  "CURED", "CURLY", "CYCLE", "DAILY", "DAIRY", "DANCE", "DANDY", "DEALT", "DEATH", "DEBUT", "DECAL", "DECAY", "DECOR", "DELAY", "DEMON",
  "DENSE", "DEPOT", "DEPTH", "DEVIL", "DIARY", "DIGIT", "DINER", "DIRTY", "DISCO", "DITCH", "DIVER", "DIZZY", "DODGE", "DONUT", "DOUBT",
  "DOUGH", "DOZEN", "DRAFT", "DRAIN", "DRAMA", "DREAD", "DREAM", "DRESS", "DRIFT", "DRILL", "DRINK", "DRIVE", "DRONE", "DROWN", "DRUID",
  "DRYLY", "DUCHY", "DUSTY", "DWARF", "DWELL", "EARLY", "EARTH", "EASEL", "EATEN", "EATER", "EBONY", "EDGES", "EERIE", "EIGHT", "ELBOW",
  "ELDER", "ELECT", "ELITE", "EMPTY", "ENACT", "ENEMY", "ENJOY", "ENTER", "ENTRY", "EQUAL", "EQUIP", "ERASE", "ERROR", "ERUPT", "ESSAY",
  "ETHIC", "EVADE", "EVENT", "EVERY", "EVICT", "EXACT", "EXCEL", "EXERT", "EXILE", "EXIST", "EXPEL", "EXTRA", "FABLE", "FACET", "FAIRY",
  "FAITH", "FALSE", "FANCY", "FATAL", "FAVOR", "FEAST", "FEMUR", "FENCE", "FERRY", "FETCH", "FEVER", "FIBER", "FIELD", "FIERY", "FIFTH",
  "FIFTY", "FIGHT", "FILMS", "FINAL", "FINCH", "FIRST", "FISHY", "FIXED", "FLAKE", "FLAME", "FLANK", "FLARE", "FLASH", "FLASK", "FLEET",
  "FLESH", "FLICK", "FLIER", "FLING", "FLINT", "FLIRT", "FLOAT", "FLOCK", "FLOOD", "FLOOR", "FLOSS", "FLOUR", "FLOWN", "FLUID", "FLUSH",
  "FLUTE", "FLYER", "FOCAL", "FOCUS", "FOGGY", "FOLLY", "FORCE", "FORGE", "FORGO", "FORTH", "FORTY", "FORUM", "FOUND", "FOUNT", "FRAME",
  "FRANK", "FRAUD", "FRESH", "FRONT", "FROST", "FRUIT", "FUNNY", "FUSED", "FUTURE", "FUZZY", "GAMES", "GAMMA", "GATOR", "GAUGE", "GEESE",
  "GENRE", "GHOST", "GIANT", "GIDDY", "GIRLY", "GIVEN", "GIVER", "GLADE", "GLAND", "GLARE", "GLASS", "GLAZE", "GLEAM", "GLEAN", "GLIDE",
  "GLOBE", "GLOOM", "GLORY", "GLOVE", "GLOWS", "GLUED", "GNASH", "GOALS", "GOING", "GONER", "GOODS", "GOOSE", "GORGE", "GRACE", "GRADE",
  "GRAFT", "GRAIN", "GRAND", "GRANT", "GRAPE", "GRAPH", "GRASP", "GRASS", "GRATE", "GRAVE", "GRAVY", "GREAT", "GREED", "GREEN", "GREET",
  "GRIEF", "GRILL", "GRIME", "GRIMY", "GRIND", "GRIPS", "GROAN", "GROOM", "GROSS", "GROUP", "GROVE", "GROWL", "GROWN", "GRUNT", "GUARD",
  "GUEST", "GUIDE", "GUILD", "GUILT", "GULLY", "GUMMY", "GUPPY", "GUSTY", "HABIT", "HAIRY", "HALVE", "HANDS", "HANDY", "HAPPY", "HARSH",
  "HASTE", "HASTY", "HATCH", "HAUNT", "HAVEN", "HAVOC", "HAZEL", "HAZY", "HEADS", "HEADY", "HEALS", "HEARD", "HEART", "HEAVY", "HEDGE",
  "HEFTY", "HELLO", "HENCE", "HERON", "HILLS", "HILLY", "HINGE", "HIPPO", "HIRED", "HITCH", "HOARD", "HOBBY", "HONEY", "HONOR", "HOODS",
  "HOOKS", "HOPED", "HORSE", "HOTEL", "HOUND", "HOUSE", "HOVER", "HOWDY", "HUMAN", "HUMID", "HURRY", "HUSKY", "HYDRA", "HYDRO", "HYENA",
  "HYPER", "ICING", "IDEAL", "IDEAS", "IDIOM", "IDIOT", "IDLER", "IDLES", "IMAGE", "IMPLY", "INDEX", "INDIE", "INGOT", "INNER", "INPUT",
  "INTER", "IONIC", "IRATE", "IRONY", "ISLET", "ISSUE", "ITEMS", "IVORY", "JACKS", "JAUNT", "JEANS", "JELLY", "JERKY", "JOKER", "JOLLY",
  "JUICE", "JUICY", "JUMBO", "JUMPY", "JUNTO", "JUROR", "KAPPA", "KARMA", "KAYAK", "KICKS", "KILLS", "KILOS", "KINGS", "KIOSK", "KNEAD",
  "KNEEL", "KNEES", "KNIFE", "KNOCK", "KNOTS", "KNOWN", "KNOWS", "KOALA", "LABEL", "LAPEL", "LAPSE", "LARGE", "LASER", "LATCH", "LATER",
  "LATEX", "LATHE", "LATIN", "LAUGH", "LAYER", "LEACH", "LEADS", "LEAFY", "LEAKY", "LEANS", "LEANT", "LEAPS", "LEARN", "LEASE", "LEASH",
  "LEAST", "LEAVE", "LEDGE", "LEMON", "LEMUR", "LEVEL", "LEVER", "LIAR", "LIBEL", "LIBRA", "LICKS", "LIGHT", "LIKED", "LIKEN", "LIMBO",
  "LIMIT", "LINEN", "LINER", "LINKS", "LIONS", "LIPID", "LITER", "LIVED", "LIVER", "LIVES", "LLAMA", "LOADS", "LOANS", "LOBBY", "LOCAL",
  "LOCKS", "LOCUS", "LODGE", "LOFTY", "LOGIC", "LOGIN", "LOGO", "LONER", "LOOPS", "LOOSE", "LORRY", "LOSER", "LOTTO", "LOTUS", "LOVED",
  "LOVER", "LOWLY", "LOYAL", "LUCID", "LUCKY", "LUMEN", "LUNCH", "LUNGS", "LUPIN", "LUSTY", "LYRIC", "MACRO", "MADAM", "MAFIA", "MAGIC",
  "MAGMA", "MAIZE", "MAJOR", "MAKER", "MAKES", "MAMBA", "MANGO", "MANIA", "MANLY", "MANOR", "MAPLE", "MARCH", "MARKS", "MARRY", "MASCOT",
  "MATCH", "MAXIM", "MAYOR", "MEANT", "MEDAL", "MEDIA", "MEDIC", "MEETS", "MELON", "MERCY", "MERGE", "MERIT", "MERRY", "METAL", "METER",
  "METRO", "MICRO", "MIDST", "MIGHT", "MILES", "MILKY", "MINCE", "MINDS", "MINER", "MINES", "MINI", "MINOR", "MINUS", "MIRTH", "MISER",
  "MISTY", "MITER", "MIXED", "MIXER", "MODEL", "MODEM", "MOIST", "MONEY", "MONKS", "MONTH", "MOODS", "MOODY", "MOOSE", "MORAL", "MORON",
  "MORPH", "MOTEL", "MOTIF", "MOTOR", "MOUND", "MOUNT", "MOURN", "MOUSE", "MOUTH", "MOVED", "MOVER", "MOVES", "MOVIE", "MUDDY", "MULCH",
  "MUMMY", "MURAL", "MUSIC", "MUSTY", "MUTED", "MYTHS", "NAIVE", "NAKED", "NAMES", "NANNY", "NASAL", "NASTY", "NATAL", "NAVAL", "NAVEL",
  "NEEDS", "NERDY", "NERVE", "NEVER", "NEWER", "NIGHT", "NINTH", "NOBLE", "NOBLY", "NOISE", "NOISY", "NOMAD", "NORTH", "NOSES", "NOTED",
  "NOTES", "NOUNS", "NOVEL", "NUDGE", "NURSE", "NUTTY", "NYLON", "OASIS", "OBESE", "OCCUR", "OCEAN", "OCTAL", "OCTET", "ODDER", "ODDLY",
  "OFFER", "OFTEN", "OGRES", "OILED", "OLDEN", "OLDER", "OLIVE", "ONION", "ONSET", "OPENS", "OPERA", "OPIUM", "OPTED", "OPTIC", "ORBIT",
  "ORDER", "ORGAN", "OTHER", "OTTER", "OUGHT", "OUNCE", "OUTER", "OVEN", "OVERT", "OWNED", "OWNER", "OXIDE", "OZONE", "PACER", "PACES",
  "PACKS", "PADDY", "PAGAN", "PAGES", "PAINS", "PAINT", "PALMS", "PANEL", "PANIC", "PANSY", "PANTS", "PAPAL", "PAPER", "PARCH", "PARRY",
  "PARSE", "PARTS", "PARTY", "PASTA", "PASTE", "PATCH", "PATHS", "PATIO", "PAUSE", "PAVED", "PAYER", "PEACE", "PEACH", "PEAKS", "PEARL",
  "PEDAL", "PEERS", "PENAL", "PENCE", "PENNY", "PEONY", "PEOPLE", "PERCH", "PERIL", "PESKY", "PETAL", "PHASE", "PHONE", "PHOTO", "PIANO",
  "PICKS", "PIECE", "PIGGY", "PILES", "PILOT", "PINCH", "PINES", "PINTO", "PIQUE", "PITCH", "PIVOT", "PIXEL", "PIXIE", "PLACE", "PLAIN",
  "PLANE", "PLANK", "PLANS", "PLANT", "PLATE", "PLAZA", "PLEAD", "PLEAT", "PLOTS", "PLUCK", "PLUME", "PLUMP", "PLUMS", "PLUSH", "POEMS",
  "POINT", "POKER", "POLAR", "POLES", "POLIO", "POLKA", "PONDS", "POOCH", "POOLS", "POPES", "POPPY", "PORCH", "PORES", "PORT", "POSES",
  "POSIT", "POSSE", "POUCH", "POUND", "POWER", "PRANK", "PRAWN", "PRESS", "PRICE", "PRICK", "PRIDE", "PRIME", "PRINT", "PRIOR", "PRISM",
  "PRIVY", "PRIZE", "PROBE", "PRONE", "PRONG", "PROOF", "PROPS", "PROSE", "PROUD", "PROVE", "PROWL", "PROXY", "PRUDE", "PRUNE", "PSALM",
  "PUFFY", "PULLS", "PULSE", "PUMA", "PUMPS", "PUNCH", "PUPIL", "PUPPY", "PUREE", "PURER", "PURGE", "PURSE", "PUSHY", "PUTTY", "QUACK",
  "QUAKE", "QUALM", "QUART", "QUEEN", "QUEER", "QUICK", "QUIET", "QUILL", "QUILT", "QUIPS", "QUIRK", "QUITE", "QUOTA", "QUOTE", "RACER",
  "RADAR", "RADIO", "RAINS", "RAINY", "RAISE", "RANCH", "RANGE", "RAPID", "RATES", "RATIO", "RAVEN", "RAZOR", "REACH", "REACT", "READS",
  "READY", "REALM", "REALS", "REBEL", "REFER", "REGAL", "REIGN", "RELAX", "RELIC", "REMIT", "RENEW", "REPLY", "RESET", "RESIN", "RESTS",
  "RETRO", "RETRY", "REVEL", "RHINO", "RHYME", "RIDER", "RIDES", "RIDGE", "RIFLE", "RIGHT", "RIGID", "RINGS", "RINSE", "RIPEN", "RISEN",
  "RISER", "RISES", "RISKY", "RIVAL", "RIVER", "ROADS", "ROBOT", "ROCKS", "ROCKY", "RODEO", "ROGUE", "ROLES", "ROMAN", "ROOFS", "ROOMS",
  "ROOMY", "ROOST", "ROOTS", "ROSES", "ROTOR", "ROUGH", "ROUND", "ROUSE", "ROUTE", "ROVER", "ROWER", "ROYAL", "RUINS", "RULER", "RULES",
  "RUMBA", "RUMOR", "RUNNY", "RURAL", "RUSTY", "SABER", "SABLE", "SADLY", "SAFER", "SAFES", "SAILS", "SAINT", "SALAD", "SALES", "SALLY",
  "SALON", "SALSA", "SALTS", "SALTY", "SAMBA", "SANDY", "SANER", "SAPPY", "SASSY", "SATIN", "SAUCE", "SAUCY", "SAUNA", "SAVED", "SAVER",
  "SAVES", "SAVOR", "SCALE", "SCALP", "SCALY", "SCAMP", "SCANS", "SCARE", "SCARF", "SCARY", "SCENE", "SCENT", "SCONE", "SCOOP", "SCOPE",
  "SCORE", "SCORN", "SCOUT", "SCOWL", "SCRAM", "SCRAP", "SCREW", "SEALS", "SEAMS", "SEATS", "SEDAN", "SEEDY", "SEEKS", "SEEMS", "SEIZE",
  "SENSE", "SERUM", "SERVE", "SETUP", "SEVEN", "SEVER", "SEWER", "SHACK", "SHADE", "SHADY", "SHAFT", "SHAKE", "SHAKY", "SHALE", "SHALL",
  "SHAME", "SHANK", "SHAPE", "SHARE", "SHARK", "SHARP", "SHAWL", "SHEAR", "SHEEP", "SHEER", "SHEET", "SHELF", "SHELL", "SHIFT", "SHINE",
  "SHINY", "SHIPS", "SHIRE", "SHIRK", "SHIRT", "SHOAL", "SHOCK", "SHOES", "SHONE", "SHOOK", "SHOOT", "SHOPS", "SHORE", "SHORT", "SHOUT",
  "SHOVE", "SHOWN", "SHOWS", "SHOWY", "SHRED", "SHREW", "SHRUB", "SHRUG", "SHUTS", "SHYLY", "SIDES", "SIEGE", "SIGHT", "SIGMA", "SIGNS",
  "SILKY", "SILLY", "SINCE", "SINEW", "SINGE", "SINGS", "SIREN", "SITAR", "SIXTH", "SIXTY", "SIZES", "SKATE", "SKEW", "SKIER", "SKIES",
  "SKILL", "SKIMP", "SKINS", "SKIRT", "SKULL", "SKUNK", "SLACK", "SLAIN", "SLANG", "SLANT", "SLATE", "SLEEK", "SLEEP", "SLEET", "SLEPT",
  "SLICE", "SLICK", "SLIDE", "SLIME", "SLIMY", "SLING", "SLINK", "SLOPE", "SLOTH", "SLOWS", "SLUSH", "SMALL", "SMART", "SMASH", "SMEAR",
  "SMELL", "SMELT", "SMILE", "SMIRK", "SMITH", "SMOCK", "SMOKE", "SMOKY", "SNACK", "SNAIL", "SNAKE", "SNARE", "SNARL", "SNEAK", "SNEER",
  "SNIFF", "SNIPE", "SNOB", "SNORE", "SNORT", "SNOUT", "SNOWS", "SNOWY", "SNUFF", "SOBER", "SOCKS", "SOGGY", "SOILS", "SOLAR", "SOLES",
  "SOLID", "SOLO", "SOLVE", "SONAR", "SONIC", "SONNY", "SORRY", "SOULS", "SOUND", "SOUPS", "SOUTH", "SPACE", "SPADE", "SPANK", "SPARE",
  "SPARK", "SPASM", "SPEAK", "SPEAR", "SPECK", "SPEED", "SPELL", "SPELT", "SPEND", "SPENT", "SPICE", "SPICY", "SPIED", "SPIES", "SPIKE",
  "SPIKY", "SPILL", "SPILT", "SPINE", "SPINY", "SPIRE", "SPITE", "SPLIT", "SPOIL", "SPOKE", "SPOOF", "SPOOK", "SPOOL", "SPOON", "SPORE",
  "SPORT", "SPOTS", "SPOUT", "SPRAY", "SPREE", "SPRIG", "SPURT", "SQUAD", "SQUAT", "SQUID", "STACK", "STAFF", "STAGE", "STAGS", "STAIN",
  "STAIR", "STAKE", "STALE", "STALK", "STALL", "STAMP", "STAND", "STARE", "STARK", "START", "STASH", "STATE", "STATS", "STAVE", "STAYS",
  "STEAD", "STEAK", "STEAL", "STEAM", "STEED", "STEEL", "STEEP", "STEER", "STEPS", "STERN", "STICK", "STIFF", "STILL", "STILT", "STING",
  "STINK", "STINT", "STIRS", "STOCK", "STOIC", "STOKE", "STOLE", "STOMP", "STONE", "STONY", "STOOD", "STOOL", "STOOP", "STOPS", "STORE",
  "STORK", "STORM", "STORY", "STOUT", "STOVE", "STRAP", "STRAW", "STRAY", "STRIP", "STRUT", "STUCK", "STUDS", "STUDY", "STUFF", "STUMP",
  "STUNG", "STUNT", "STYLE", "SUAVE", "SUGAR", "SUITE", "SUITS", "SUNNY", "SUPER", "SURGE", "SWAMI", "SWAMP", "SWARM", "SWAY", "SWEAR",
  "SWEAT", "SWEEP", "SWEET", "SWELL", "SWEPT", "SWIFT", "SWIME", "SWINE", "SWING", "SWIPE", "SWIRL", "SWISH", "SWISS", "SWOON", "SWOOP",
  "SWORD", "SWORE", "SWORN", "SYRUP", "TABLE", "TABOO", "TACIT", "TACKS", "TAILS", "TAINT", "TAKEN", "TAKER", "TAKES", "TALES", "TALKS",
  "TALLY", "TALON", "TANGO", "TANGY", "TANKS", "TAPIR", "TARDY", "TASTE", "TASTY", "TAUNT", "TAWNY", "TAXED", "TAXIS", "TEACH", "TEALS",
  "TEAMS", "TEARS", "TEARY", "TEASE", "TEDDY", "TEENS", "TEETH", "TELLS", "TEMPO", "TEMPT", "TENET", "TENOR", "TENSE", "TENTH", "TENTS",
  "TERMS", "TERSE", "TESTY", "THANK", "THEFT", "THEIR", "THEME", "THERE", "THESE", "THETA", "THICK", "THIEF", "THIGH", "THING", "THINK",
  "THIRD", "THONG", "THORN", "THOSE", "THREE", "THREW", "THROB", "THROW", "THRUM", "THUGS", "THUMB", "THUMP", "YACHT", "YEARS", "YEAST",
  "YIELD", "YOUTH", "ZEBRA", "ZESTY", "ZONAL", "ZONES"
]);

// All unique words that appear in curated puzzle solutions.
// Several common words (WORLD, WATER, WATCH, etc.) were absent from the main
// VALID_WORDS list, making those puzzles unwinnable. This set guarantees every
// solution word is accepted regardless of the main set's coverage.
const PUZZLE_WORDS = new Set([
  "APPLE","BEACH","CLOCK","DRINK","EARTH","WORLD","SMILE","TRAIN","DANCE","HOUSE",
  "SHARK","WHALE","OCEAN","CORAL","SOLID","PLANT","BERRY","TREES","FRUIT","GRASS",
  "STORM","CLOUD","RAINY","SUNNY","WINDY","CHAIR","TABLE","PLATE","SPOON","KNIFE",
  "BLACK","WHITE","GREEN","BROWN","SHADE","HEART","BRAIN","LAUGH","HAPPY","LIGHT",
  "NIGHT","DREAM","SLEEP","AWAKE","MUSIC","PIANO","CHORD","STAGE","PLANE","TRUCK",
  "MOTOR","CYCLE","FLAME","SMOKE","WATER","STEAM","SWEET","TASTY","HONEY","BREAD",
  "CREAM","SPACE","STARS","ORBIT","SOLAR","COMET","PAPER","BOOKS","WRITE","STUDY",
  "LEARN","SNAKE","BIRDS","TIGER","PANDA","KOALA","BRASS","METAL","STEEL","GLASS",
  "STONE","SPORT","MATCH","SCORE","COACH","ARENA","GRAPE","MELON","LEMON","PEACH",
  "TIMER","WATCH","HOURS","DAILY","SHIRT","JEANS","SOCKS","GLOVE","DRESS","RIVER",
  "LAKES","FLUTE","CELLO","AUDIO","LYRIC","NORTH","SOUTH","GUIDE","ROUTE","TRACK",
  "YOUTH","ELDER","CHILD","ADULT","HUMAN","BRUSH","PAINT","COLOR","BOARD","MAGIC",
  "DEVIL","ANGER","FAIRY","GNOME","WHEAT","FLOUR","CANDY","SUGAR","CHECK","SOLVE",
  "SMART","GRAND","MINOR","MAJOR","LOCAL","OUTER",
]);

export interface PuzzleDef {
  id: number;
  name: string;
  solution: string[]; // exactly 5 words, e.g. ["APPLE", "BEACH", "CLOCK", "DRINK", "EARTH"]
}

export const CURATED_PUZZLES: PuzzleDef[] = [
  { id: 1, name: "Starter Slate", solution: ["APPLE", "BEACH", "CLOCK", "DRINK", "EARTH"] },
  { id: 2, name: "Happy Motion", solution: ["WORLD", "SMILE", "TRAIN", "DANCE", "HOUSE"] },
  { id: 3, name: "Deep Marine", solution: ["SHARK", "WHALE", "OCEAN", "CORAL", "SOLID"] },
  { id: 4, name: "Rich Forest", solution: ["PLANT", "BERRY", "TREES", "FRUIT", "GRASS"] },
  { id: 5, name: "Sky Forecast", solution: ["STORM", "CLOUD", "RAINY", "SUNNY", "WINDY"] },
  { id: 6, name: "Cozy Dining", solution: ["CHAIR", "TABLE", "PLATE", "SPOON", "KNIFE"] },
  { id: 7, name: "True Spectrum", solution: ["BLACK", "WHITE", "GREEN", "BROWN", "SHADE"] },
  { id: 8, name: "Warm Feelings", solution: ["HEART", "BRAIN", "SMILE", "LAUGH", "HAPPY"] },
  { id: 9, name: "Night Dreamer", solution: ["LIGHT", "NIGHT", "DREAM", "SLEEP", "AWAKE"] },
  { id: 10, name: "Vibrant Stage", solution: ["MUSIC", "PIANO", "CHORD", "DANCE", "STAGE"] },
  { id: 11, name: "City Transit", solution: ["PLANE", "TRAIN", "TRUCK", "MOTOR", "CYCLE"] },
  { id: 12, name: "Raw Elements", solution: ["FLAME", "SMOKE", "WATER", "STEAM", "EARTH"] },
  { id: 13, name: "Sweet Morning", solution: ["SWEET", "TASTY", "HONEY", "BREAD", "CREAM"] },
  { id: 14, name: "Night Cosmos", solution: ["SPACE", "STARS", "ORBIT", "SOLAR", "COMET"] },
  { id: 15, name: "Desk Study", solution: ["PAPER", "BOOKS", "WRITE", "STUDY", "LEARN"] },
  { id: 16, name: "Animal Safari", solution: ["SNAKE", "BIRDS", "TIGER", "PANDA", "KOALA"] },
  { id: 17, name: "Tough Alloys", solution: ["BRASS", "METAL", "STEEL", "GLASS", "STONE"] },
  { id: 18, name: "Sport Arena", solution: ["SPORT", "MATCH", "SCORE", "COACH", "ARENA"] },
  { id: 19, name: "Summer Fruit", solution: ["FRUIT", "GRAPE", "MELON", "LEMON", "PEACH"] },
  { id: 20, name: "Time Watcher", solution: ["CLOCK", "TIMER", "WATCH", "HOURS", "DAILY"] },
  { id: 21, name: "Morning Wear", solution: ["SHIRT", "JEANS", "SOCKS", "GLOVE", "DRESS"] },
  { id: 22, name: "Clear Waters", solution: ["RIVER", "OCEAN", "BEACH", "LAKES", "WATER"] },
  { id: 23, name: "Harmonic Tone", solution: ["FLUTE", "PIANO", "CELLO", "AUDIO", "LYRIC"] },
  { id: 24, name: "True Compass", solution: ["NORTH", "SOUTH", "GUIDE", "ROUTE", "TRACK"] },
  { id: 25, name: "Human Journey", solution: ["YOUTH", "ELDER", "CHILD", "ADULT", "HUMAN"] },
  { id: 26, name: "Artist Studio", solution: ["BRUSH", "PAINT", "SHADE", "COLOR", "BOARD"] },
  { id: 27, name: "Magic Kingdom", solution: ["MAGIC", "DEVIL", "ANGER", "FAIRY", "GNOME"] },
  { id: 28, name: "Baker Pantry", solution: ["WHEAT", "FLOUR", "CANDY", "SUGAR", "HONEY"] },
  { id: 29, name: "Sharp Thinking", solution: ["CHECK", "SOLVE", "BRAIN", "MATCH", "SMART"] },
  { id: 30, name: "Scale Dynamics", solution: ["GRAND", "MINOR", "MAJOR", "LOCAL", "OUTER"] }
];

/**
 * Gets a daily puzzle index based on the current date relative to epoch.
 */
export function getDailyPuzzleIndex(): number {
  const epoch = new Date("2026-01-01").getTime();
  const current = new Date().getTime();
  const dayIndex = Math.floor((current - epoch) / (1000 * 60 * 60 * 24));
  return Math.abs(dayIndex) % CURATED_PUZZLES.length;
}

/**
 * Generates an array of target words by selecting from the curated puzzle structure
 * and shuffling its letters in a controlled scrambled format.
 * Makes sure the scramble is not already solved at the start.
 */
export function getScrambledLetters(solutionWords: string[]): { id: number; char: string }[] {
  // Combine all letters of the solution words
  const allChars = solutionWords.join("").split("");
  
  // Map index to a stable id and character
  let tileList = allChars.map((char, index) => ({
    id: index,
    char: char.toUpperCase()
  }));

  // Shuffle the tiles until no row represents a valid 5-letter word
  // (to prevent immediate victory or pre-formed correct words)
  let tries = 0;
  while (tries < 50) {
    // Fisher-Yates shuffle
    for (let i = tileList.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = tileList[i];
      tileList[i] = tileList[j];
      tileList[j] = temp;
    }

    // Check if any row happens to form a valid word in the dictionary
    let hasValidRow = false;
    for (let row = 0; row < 5; row++) {
      const start = row * 5;
      const rowWord = tileList.slice(start, start + 5).map(t => t.char).join("");
      if (VALID_WORDS.has(rowWord)) {
        hasValidRow = true;
        break;
      }
    }

    if (!hasValidRow) {
      break;
    }
    tries++;
  }

  return tileList;
}

/**
 * Checks a row represented by 5 characters against the bundled dictionary.
 * PUZZLE_WORDS guarantees all curated solution words pass even if absent from
 * the main set. WordNet provides runtime extension for player-discovered words.
 */
export function isWordValid(word: string): boolean {
  const w = word.toUpperCase();
  return VALID_WORDS.has(w) || PUZZLE_WORDS.has(w);
}
