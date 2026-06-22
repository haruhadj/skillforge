export const FALLBACK_WORDS = {
  easy: [
    {
      word: "cat",
      definition: "A small domesticated carnivorous mammal.",
      partOfSpeech: "noun",
      example: "The cat sat on the mat.",
    },
    {
      word: "sun",
      definition: "The star at the center of our solar system.",
      partOfSpeech: "noun",
      example: "The sun shines brightly today.",
    },
    {
      word: "jump",
      definition: "To push oneself off a surface and into the air.",
      partOfSpeech: "verb",
      example: "She can jump very high.",
    },
    {
      word: "blue",
      definition: "A color resembling the sky on a clear day.",
      partOfSpeech: "adjective",
      example: "The blue sky was beautiful.",
    },
    {
      word: "fast",
      definition: "Moving or capable of moving at high speed.",
      partOfSpeech: "adjective",
      example: "The fast car zoomed past.",
    },
    {
      word: "tree",
      definition: "A woody perennial plant with a trunk.",
      partOfSpeech: "noun",
      example: "A bird sat in the tree.",
    },
    {
      word: "book",
      definition: "A written or printed work consisting of pages.",
      partOfSpeech: "noun",
      example: "She read the book in one day.",
    },
    {
      word: "rain",
      definition: "Water falling from clouds in drops.",
      partOfSpeech: "noun",
      example: "The rain fell softly.",
    },
  ],
  medium: [
    {
      word: "champion",
      definition: "A person who has won a competition.",
      partOfSpeech: "noun",
      example: "She became the champion of the tournament.",
    },
    {
      word: "graceful",
      definition: "Having elegance and beauty of movement.",
      partOfSpeech: "adjective",
      example: "The dancer was graceful on stage.",
    },
    {
      word: "triumph",
      definition: "A great victory or achievement.",
      partOfSpeech: "noun",
      example: "The team celebrated their triumph.",
    },
    {
      word: "curious",
      definition: "Eager to know or learn something.",
      partOfSpeech: "adjective",
      example: "The curious child explored the garden.",
    },
    {
      word: "whisper",
      definition: "Speak very softly using one's breath.",
      partOfSpeech: "verb",
      example: "She began to whisper a secret.",
    },
    {
      word: "journal",
      definition: "A daily record of news and events.",
      partOfSpeech: "noun",
      example: "He wrote in his journal every night.",
    },
    {
      word: "venture",
      definition: "A risky or daring journey or undertaking.",
      partOfSpeech: "noun",
      example: "The venture into the unknown was exciting.",
    },
    {
      word: "frantic",
      definition: "Wildly excited or uncontrolled.",
      partOfSpeech: "adjective",
      example: "She was frantic when she lost her keys.",
    },
  ],
  hard: [
    {
      word: "melancholy",
      definition: "A feeling of pensive sadness.",
      partOfSpeech: "noun",
      example: "A sense of melancholy filled the empty room.",
    },
    {
      word: "ephemeral",
      definition: "Lasting for a very short time.",
      partOfSpeech: "adjective",
      example: "The ephemeral beauty of cherry blossoms delighted everyone.",
    },
    {
      word: "tenacious",
      definition: "Holding firmly to a position or opinion.",
      partOfSpeech: "adjective",
      example: "Her tenacious spirit helped her succeed.",
    },
    {
      word: "labyrinth",
      definition: "A complicated irregular network of passages.",
      partOfSpeech: "noun",
      example: "They got lost in the labyrinth of streets.",
    },
    {
      word: "resplendent",
      definition: "Attractive and impressive through being richly colorful.",
      partOfSpeech: "adjective",
      example: "She looked resplendent in her golden gown.",
    },
    {
      word: "oblivious",
      definition: "Not aware of or concerned about what is happening.",
      partOfSpeech: "adjective",
      example: "He was oblivious to the noise around him.",
    },
    {
      word: "cacophony",
      definition: "A harsh discordant mixture of sounds.",
      partOfSpeech: "noun",
      example: "The cacophony of the city overwhelmed her senses.",
    },
    {
      word: "persevere",
      definition: "Continue in a course of action despite difficulty.",
      partOfSpeech: "verb",
      example: "You must persevere through the hardest challenges.",
    },
  ],
};

export const TOPIC_WORDS = {
  animals: {
    easy: [
      { word: "dog", definition: "A domesticated carnivorous mammal.", partOfSpeech: "noun", example: "The dog wagged its tail.", topic: "animals" },
      { word: "frog", definition: "A tailless amphibian with long hind legs.", partOfSpeech: "noun", example: "The frog jumped into the pond.", topic: "animals" },
      { word: "bear", definition: "A large heavy mammal with thick fur.", partOfSpeech: "noun", example: "The bear caught a fish from the river.", topic: "animals" },
      { word: "bird", definition: "A warm-blooded egg-laying vertebrate with feathers.", partOfSpeech: "noun", example: "The bird sang a beautiful song.", topic: "animals" },
      { word: "fish", definition: "A limbless cold-blooded aquatic vertebrate.", partOfSpeech: "noun", example: "We watched the fish swim in the tank.", topic: "animals" },
    ],
    medium: [
      { word: "dolphin", definition: "An intelligent marine mammal.", partOfSpeech: "noun", example: "The dolphin leaped out of the water.", topic: "animals" },
      { word: "penguin", definition: "A flightless seabird of the southern hemisphere.", partOfSpeech: "noun", example: "The penguin waddled across the ice.", topic: "animals" },
      { word: "leopard", definition: "A large wild cat with a spotted coat.", partOfSpeech: "noun", example: "The leopard stalked its prey.", topic: "animals" },
      { word: "parrot", definition: "A colorful bird known for mimicking speech.", partOfSpeech: "noun", example: "The parrot repeated every word.", topic: "animals" },
      { word: "giraffe", definition: "A tall African mammal with a very long neck.", partOfSpeech: "noun", example: "The giraffe reached the highest leaves.", topic: "animals" },
    ],
    hard: [
      { word: "chameleon", definition: "A lizard that can change color.", partOfSpeech: "noun", example: "The chameleon blended into the leaves.", topic: "animals" },
      { word: "butterfly", definition: "A flying insect with large colorful wings.", partOfSpeech: "noun", example: "The butterfly landed on the flower.", topic: "animals" },
      { word: "crocodile", definition: "A large predatory semiaquatic reptile.", partOfSpeech: "noun", example: "The crocodile lurked beneath the water.", topic: "animals" },
      { word: "rhinoceros", definition: "A large herbivorous mammal with horns.", partOfSpeech: "noun", example: "The rhinoceros charged across the plain.", topic: "animals" },
    ],
  },
  science: {
    easy: [
      { word: "moon", definition: "The natural satellite of the earth.", partOfSpeech: "noun", example: "The moon shone brightly at night.", topic: "science" },
      { word: "star", definition: "A luminous point in the night sky.", partOfSpeech: "noun", example: "She wished upon a star.", topic: "science" },
      { word: "atom", definition: "The smallest unit of a chemical element.", partOfSpeech: "noun", example: "Everything is made of atoms.", topic: "science" },
      { word: "cell", definition: "The smallest structural unit of a living organism.", partOfSpeech: "noun", example: "Each cell contains DNA.", topic: "science" },
    ],
    medium: [
      { word: "gravity", definition: "The force that attracts objects toward the earth.", partOfSpeech: "noun", example: "Gravity keeps us on the ground.", topic: "science" },
      { word: "crystal", definition: "A solid whose atoms are arranged in a regular pattern.", partOfSpeech: "noun", example: "The crystal sparkled in the light.", topic: "science" },
      { word: "element", definition: "A substance that cannot be broken down further.", partOfSpeech: "noun", example: "Oxygen is a vital element for life.", topic: "science" },
      { word: "nucleus", definition: "The central part of an atom.", partOfSpeech: "noun", example: "Protons are found in the nucleus.", topic: "science" },
      { word: "sustain", definition: "To strengthen or support over a long period.", partOfSpeech: "verb", example: "Plants sustain life on earth.", topic: "science" },
    ],
    hard: [
      { word: "hypothesis", definition: "A proposed explanation made as a starting point.", partOfSpeech: "noun", example: "The scientist tested her hypothesis.", topic: "science" },
      { word: "experiment", definition: "A scientific procedure to test a hypothesis.", partOfSpeech: "noun", example: "The experiment yielded surprising results.", topic: "science" },
      { word: "microscope", definition: "An instrument used to see very small objects.", partOfSpeech: "noun", example: "She examined the cells under a microscope.", topic: "science" },
      { word: "phenomenon", definition: "A fact or event observed to exist or happen.", partOfSpeech: "noun", example: "The aurora borealis is a natural phenomenon.", topic: "science" },
    ],
  },
  geography: {
    easy: [
      { word: "lake", definition: "A large body of water surrounded by land.", partOfSpeech: "noun", example: "They swam in the lake.", topic: "geography" },
      { word: "hill", definition: "A naturally raised area of land.", partOfSpeech: "noun", example: "They climbed to the top of the hill.", topic: "geography" },
      { word: "cave", definition: "A natural underground chamber.", partOfSpeech: "noun", example: "Bats live inside the cave.", topic: "geography" },
      { word: "isle", definition: "A small island.", partOfSpeech: "noun", example: "The isle was surrounded by clear water.", topic: "geography" },
    ],
    medium: [
      { word: "volcano", definition: "A mountain with an opening through which lava erupts.", partOfSpeech: "noun", example: "The volcano erupted with great force.", topic: "geography" },
      { word: "glacier", definition: "A slowly moving mass of ice.", partOfSpeech: "noun", example: "The glacier carved out a valley.", topic: "geography" },
      { word: "plateau", definition: "An area of elevated flat land.", partOfSpeech: "noun", example: "The plateau offered a stunning view.", topic: "geography" },
      { word: "country", definition: "A nation with its own government.", partOfSpeech: "noun", example: "Each country has its own culture.", topic: "geography" },
    ],
    hard: [
      { word: "archipelago", definition: "A group of islands.", partOfSpeech: "noun", example: "The archipelago stretched across the ocean.", topic: "geography" },
      { word: "peninsula", definition: "Land surrounded by water on three sides.", partOfSpeech: "noun", example: "The peninsula jutted into the sea.", topic: "geography" },
      { word: "continent", definition: "One of the seven major land masses.", partOfSpeech: "noun", example: "Africa is the second largest continent.", topic: "geography" },
      { word: "hemisphere", definition: "One half of the earth.", partOfSpeech: "noun", example: "Australia is in the southern hemisphere.", topic: "geography" },
    ],
  },
  food: {
    easy: [
      { word: "cake", definition: "A sweet baked dessert.", partOfSpeech: "noun", example: "She baked a chocolate cake.", topic: "food" },
      { word: "soup", definition: "A liquid dish made by boiling ingredients.", partOfSpeech: "noun", example: "Hot soup warms you up on cold days.", topic: "food" },
      { word: "rice", definition: "Grains from a cereal plant used as food.", partOfSpeech: "noun", example: "Rice is a staple food in many countries.", topic: "food" },
      { word: "corn", definition: "A tall cereal plant bearing grains on a cob.", partOfSpeech: "noun", example: "They picked fresh corn from the field.", topic: "food" },
      { word: "bake", definition: "To cook food by dry heat in an oven.", partOfSpeech: "verb", example: "Let us bake cookies today.", topic: "food" },
    ],
    medium: [
      { word: "waffle", definition: "A batter cake baked in a waffle iron.", partOfSpeech: "noun", example: "She topped her waffle with berries.", topic: "food" },
      { word: "muffin", definition: "A small dome-shaped baked good.", partOfSpeech: "noun", example: "He grabbed a blueberry muffin for breakfast.", topic: "food" },
      { word: "ginger", definition: "A hot fragrant spice made from a root.", partOfSpeech: "noun", example: "Ginger adds warmth to any recipe.", topic: "food" },
      { word: "pastry", definition: "Dough used as a base for baked goods.", partOfSpeech: "noun", example: "The pastry was flaky and golden.", topic: "food" },
    ],
    hard: [
      { word: "restaurant", definition: "A place where meals are prepared and served.", partOfSpeech: "noun", example: "They dined at a fancy restaurant.", topic: "food" },
      { word: "marmalade", definition: "A preserve made from citrus fruit.", partOfSpeech: "noun", example: "She spread marmalade on her toast.", topic: "food" },
      { word: "cantaloupe", definition: "A type of melon with orange flesh.", partOfSpeech: "noun", example: "The cantaloupe was perfectly ripe.", topic: "food" },
      { word: "cinnamon", definition: "An aromatic spice from tree bark.", partOfSpeech: "noun", example: "Cinnamon adds a warm flavor to desserts.", topic: "food" },
    ],
  },
  music: {
    easy: [
      { word: "drum", definition: "A percussion instrument struck with sticks.", partOfSpeech: "noun", example: "He played the drum in the band.", topic: "music" },
      { word: "harp", definition: "A stringed instrument played by plucking.", partOfSpeech: "noun", example: "The harp produced a beautiful sound.", topic: "music" },
      { word: "song", definition: "A short piece of music with words.", partOfSpeech: "noun", example: "She sang a lovely song.", topic: "music" },
      { word: "note", definition: "A single sound of a particular pitch.", partOfSpeech: "noun", example: "He held the note perfectly.", topic: "music" },
    ],
    medium: [
      { word: "rhythm", definition: "A strong regular repeated pattern of sound.", partOfSpeech: "noun", example: "The rhythm made everyone dance.", topic: "music" },
      { word: "melody", definition: "A sequence of notes forming a tune.", partOfSpeech: "noun", example: "The melody was simple but beautiful.", topic: "music" },
      { word: "concert", definition: "A live performance of music.", partOfSpeech: "noun", example: "They attended a concert downtown.", topic: "music" },
      { word: "trumpet", definition: "A brass musical instrument with a bright tone.", partOfSpeech: "noun", example: "The trumpet solo was outstanding.", topic: "music" },
    ],
    hard: [
      { word: "xylophone", definition: "A percussion instrument with wooden bars.", partOfSpeech: "noun", example: "She played a tune on the xylophone.", topic: "music" },
      { word: "crescendo", definition: "A gradual increase in loudness.", partOfSpeech: "noun", example: "The music rose to a dramatic crescendo.", topic: "music" },
      { word: "orchestra", definition: "A large group of musicians playing together.", partOfSpeech: "noun", example: "The orchestra performed a symphony.", topic: "music" },
      { word: "rehearsal", definition: "A practice session for a performance.", partOfSpeech: "noun", example: "The band had a rehearsal before the show.", topic: "music" },
    ],
  },
  sports: {
    easy: [
      { word: "goal", definition: "A point scored in a game.", partOfSpeech: "noun", example: "She scored the winning goal.", topic: "sports" },
      { word: "kick", definition: "To strike with the foot.", partOfSpeech: "verb", example: "He learned to kick the ball far.", topic: "sports" },
      { word: "race", definition: "A competition of speed.", partOfSpeech: "noun", example: "She won first place in the race.", topic: "sports" },
      { word: "swim", definition: "To move through water using the body.", partOfSpeech: "verb", example: "They love to swim in the ocean.", topic: "sports" },
    ],
    medium: [
      { word: "trophy", definition: "A prize for winning a competition.", partOfSpeech: "noun", example: "The team lifted the trophy in celebration.", topic: "sports" },
      { word: "soccer", definition: "A game played by kicking a ball into a goal.", partOfSpeech: "noun", example: "Soccer is popular worldwide.", topic: "sports" },
      { word: "tennis", definition: "A sport played with rackets and a ball.", partOfSpeech: "noun", example: "She practices tennis every morning.", topic: "sports" },
      { word: "athlete", definition: "A person skilled in physical exercise.", partOfSpeech: "noun", example: "The athlete trained hard every day.", topic: "sports" },
    ],
    hard: [
      { word: "tournament", definition: "A series of contests between many competitors.", partOfSpeech: "noun", example: "Teams from around the world joined the tournament.", topic: "sports" },
      { word: "gymnasium", definition: "A room or building for indoor sports.", partOfSpeech: "noun", example: "The gymnasium echoed with cheering fans.", topic: "sports" },
      { word: "trampoline", definition: "A device for bouncing on, used in gymnastics.", partOfSpeech: "noun", example: "She practiced flips on the trampoline.", topic: "sports" },
      { word: "badminton", definition: "A sport played with rackets and a shuttlecock.", partOfSpeech: "noun", example: "They played badminton in the backyard.", topic: "sports" },
    ],
  },
};

// Tag existing fallback words with topics
const TOPIC_TAGS = {
  cat: "animals", sun: "science", jump: "sports", tree: "science", rain: "science",
  champion: "sports", triumph: "sports", cacophony: "music",
  melancholy: "general", labyrinth: "geography", persevere: "general",
};
Object.values(FALLBACK_WORDS).forEach((words) => {
  words.forEach((w) => {
    w.topic = TOPIC_TAGS[w.word] || "general";
  });
});
