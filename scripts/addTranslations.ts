import fs from 'fs';
import path from 'path';

function run() {
  const enPath = path.resolve('public/locales/en/common.json');
  const hiPath = path.resolve('public/locales/hi/common.json');
  const knPath = path.resolve('public/locales/kn/common.json');
  
  const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));
  const hiData = JSON.parse(fs.readFileSync(hiPath, 'utf8'));
  const knData = JSON.parse(fs.readFileSync(knPath, 'utf8'));

  const gameContentTranslationsHi: any = {
    // RememberMatch
    "Tea Kettle": "चाय की केतली",
    "Tea Cup": "चाय का कप",
    "Cooking Pot": "खाना पकाने का बर्तन",
    "Pressure Cooker": "प्रेशर कुकर",
    "Serving Spoon": "परोसने का चम्मच",
    "Salt": "नमक",
    "Bowl": "कटोरी",
    "Pickle Jar": "अचार का जार",

    "Coconut": "नारियल",
    "Banana": "केला",
    "Mango": "आम",
    "Rice": "चावल",
    "Tomato": "टमाटर",
    "Onion": "प्याज़",
    "Lime": "नींबू",
    "Apple": "सेब",
    "Grapes": "अंगूर",
    "Orange": "संतरा",

    "Marigold": "गेंदा",
    "Jasmine": "चमेली",
    "Tulsi": "तुलसी",
    "Rose": "गुलाब",
    "Sunflower": "सूरजमुखी",
    "Lotus": "कमल",
    "Tulip": "ट्यूलिप",
    "Seedling": "पौधा",

    "Sparrow": "गौरैया",
    "Peacock": "मोर",
    "Cow": "गाय",
    "Cat": "बिल्ली",
    "Dog": "कुत्ता",
    "Parrot": "तोता",
    "Butterfly": "तितली",
    "Elephant": "हाथी",

    "Diya": "दीया",
    "Temple Bell": "मंदिर की घंटी",
    "Umbrella": "छाता",
    "Clock": "घड़ी",
    "Books": "किताबें",
    "Lamp": "दीपक",
    "Bag": "थैला",
    "Remote": "रिमोट",

    "Which of these was in the game?": "इनमें से खेल में क्या था?",

    // SpotFocus
    "Coffee Cup": "काफी का कप",
    "Frying Pan": "तवा",
    "Soup Spoon": "सूप का चम्मच",
    "Pepper": "काली मिर्च",
    "Plate": "प्लेट",
    "Jam Jar": "जैम का जार",

    "Pineapple": "अनानास",
    "Watermelon": "तरबूज",
    "Lemon": "नींबू",
    "Strawberry": "स्ट्रॉबेरी",
    "Garlic": "लहसुन",
    "Carrot": "गाजर",

    "Pigeon": "कबूतर",
    "Swan": "हंस",
    "Horse": "घोड़ा",
    "Tiger": "बाघ",
    "Rabbit": "खरगोश",

    "Lily": "कुमुद",
    "Cactus": "नागफनी",

    "Bicycle": "साइकिल",
    "Wrist Watch": "कलाई घड़ी",
    "Newspaper": "अखबार",
    "Candle": "मोमबत्ती",
    "Purse": "पर्स",
    "Phone": "फोन",

    "Grandma with coffee": "कॉफी के साथ दादी जी",
    "Grandma with tea": "चाय के साथ दादी जी",
    "Grandpa reading": "दादा जी पढ़ रहे हैं",
    "Grandpa sleeping": "दादा जी सो रहे हैं",
    "Wall clock": "दीवार घड़ी",
    "Wall painting": "दीवार की पेंटिंग",

    "Plant in a red pot": "लाल गमले में पौधा",
    "Plant in a blue pot": "नीले गमले में पौधा",
    "Cushion (red)": "कुशन (लाल)",
    "Cushion (blue)": "कुशन (नीला)",
    "Small rug": "छोटा गलीचा",
    "Large rug": "बड़ा गलीचा",

    "A beautiful quiet garden": "एक सुंदर शांत बगीचा",
    "A cozy living room": "एक आरामदायक बैठक का कमरा",

    // Morning Routine
    "Morning Routine": "सुबह की दिनचर्या",
    "Help plan your morning.": "अपनी सुबह की योजना बनाने में मदद करें।",
    "Wake up": "जागना",
    "Start the morning": "सुबह की शुरुआत",
    "Brush teeth": "दांत साफ़ करना",
    "Fresh and clean": "ताज़ा और साफ़",
    "Eat breakfast": "नाश्ता करना",
    "Idli or upma": "इडली या उपमा",
    "Drink chai": "चाय पीना",
    "Sit and relax": "बैठो और आराम करो",
    "Read newspaper": "अखबार पढ़ना",
    "Catch up on news": "समाचार पकड़ो",

    "Get Dressed": "कपटों पहनें",
    "Choose clothes": "कपड़े चुनें",
    "Make Bed": "बिस्तर बनाएं",
    "Tidy room": "साफ़ कमरा",

    "Evening Walk": "शाम की सैर",
    "A refreshing evening walk.": "एक ताज़ा शाम की सैर।",
    "Wear shoes": "जूते पहनें",
    "Ready for walking": "चलने के लिए तैयार",
    "Lock door": "दरवाजा बंद करो",
    "Secure the house": "घर सुरक्षित करो",
    "Take umbrella": "छाता ले लो",
    "In case of rain": "बारिश के मामले में",
    "Walk to park": "पार्क तक चलें",
    "Enjoy the breeze": "हवा का आनंद लें",

    "Gardening Time": "बागवानी का समय",
    "Taking care of your plants.": "अपने पौधों की देखभाल करना।",
    "Get watering can": "पानी का बर्तन लें",
    "Fill with water": "पानी से भरें",
    "Water plants": "पौधों को पानी दें",
    "Nourish them": "उन्हें पोषण दें",
    "Pluck dry leaves": "सूखे पत्ते तोड़ें",
    "Keep plants healthy": "पौधों को स्वस्थ रखें",

    "Preparing Lunch": "दोपहर का भोजन तैयार करना",
    "Cooking a simple meal.": "साधारण खाना पकाना।",
    "Wash vegetables": "सब्जियां धो लें",
    "Clean thoroughly": "अच्छी तरह साफ करें",
    "Chop vegetables": "सब्जियां काटें",
    "Fine pieces": "बारीक टुकड़े",
    "Cook rice": "चावल पकाएं",
    "Soft and fluffy": "नरम और फूला हुआ",
    "Make dal": "दाल बनाओ",
    "Add spices": "मसाले डालें",

    "Getting Ready for Bed": "सोने की तैयारी",
    "Winding down for the night.": "रात के लिए आराम।",
    "Lock main door": "मुख्य दरवाजा बंद करो",
    "Safety first": "सुरक्षा पहले",
    "Turn off lights": "लाइटें बंद कर दें",
    "Save electricity": "बिजली बचाएं",
    "Drink warm milk": "गर्म दूध पियें",
    "Sleep well": "अच्छी नींद",

    "Going to the Market": "बाजार जाना",
    "Buying fresh produce.": "ताजी उपज खरीदना।",
    "Take shopping bag": "शॉपिंग बैग लें",
    "Cloth bag": "कपड़े का थैला",
    "Check wallet": "वॉलेट जांचें",
    "Keep cash ready": "नकदी तैयार रखें",
    "Buy vegetables": "सब्जियां खरीदें",
    "Fresh and green": "ताजा और हरा",
    "Buy fruits": "फल खरीदें",
    "Sweet and ripe": "मीठा और पका हुआ",

    "Visiting the Doctor": "डॉक्टर से मिलने जाना",
    "Routine check up.": "नियमित जांच।",
    "Take medical file": "मेडिकल फाइल लें",
    "Previous records": "पिछले रिकॉर्ड",
    "Book cab": "कैब बुक करें",
    "Reach on time": "समय पर पहुंचें",
    "Wait in clinic": "क्लिनिक में प्रतीक्षा करें",
    "Read a magazine": "एक पत्रिका पढ़ें",
    "Consult doctor": "डॉक्टर से सलाह लें",
    "Discuss health": "स्वास्थ्य पर चर्चा करें",

    "It's raining outside!": "बाहर बारिश हो रही है!",
    "Do you take an umbrella or wear a raincoat?": "क्या आप छतरी लेते हैं या रेनकोट पहनते हैं?",
    "Take umbrella": "छाता ले लो",
    "Wear raincoat": "रेनकोट पहनो",

    "Your friend calls and asks to join you.": "आपका मित्र आपको कॉल करता है और आपके साथ जुड़ने के लिए कहता है।",
    "Do you wait for them or start walking?": "क्या आप उनका इंतजार करते हैं या चलना शुरू करते हैं?",
    "Wait for friend": "दोस्त का इंतजार करें",
    "Start walking": "चलना शुरू करें",

    "The store ran out of your favorite biscuits.": "दुकान में आपके पसंदीदा बिस्कुट खत्म हो गए।",
    "Do you buy another brand or go without?": "क्या आप दूसरा ब्रांड खरीदते हैं या उसके बिना चले जाते हैं?",
    "Buy another brand": "दूसरा ब्रांड खरीदें",
    "Go without": "बिना चले जाओ",

    "You feel a bit tired today.": "आप आज थोड़ा थका हुआ महसूस कर रहे हैं।",
    "Do you rest longer or do a light version?": "क्या आप ज्यादा देर तक आराम करते हैं या हल्का संस्करण करते हैं?",
    "Rest longer": "लंबा आराम करो",
    "Do light version": "हल्का संस्करण करें",

    "A power cut happens suddenly!": "अचानक बिजली कटौती होती है!",
    "Do you light a candle or turn on the emergency lamp?": "क्या आप मोमबत्ती जलाते हैं या आपातकालीन लैंप चालू करते हैं?",
    "Light candle": "मोमबत्ती जलाएं",
    "Turn on emergency lamp": "आपातकालीन लैंप चालू करें",

    "You forgot an item at the store.": "आप दुकान पर एक वस्तु भूल गए।",
    "Do you go back for it or adjust without it?": "क्या आप इसके लिए वापस जाते हैं या इसके बिना सामंजस्य बिठाते हैं?",
    "Go back": "वापस जाओ",
    "Adjust without it": "इसके बिना समायोजित करें",

    "The milk boiled over!": "दूध उबल गया!",
    "Clean the stove before sitting down.": "बैठने से पहले चूल्हा साफ कर लें।",

    "A stray dog is blocking the gate!": "एक आवारा कुत्ता गेट रोक रहा है!",
    "Wait patiently for it to leave.": "इसके जाने का धैर्यपूर्वक इंतजार करें।",

    "You knocked over a potted plant!": "आपने गमले में लगा एक पौधा गिरा दिया!",
    "Repot it and clean the mess.": "इसे दोबारा गमले में लगायें और गन्दगी साफ़ करें।",
    
    "Unexpected guests arrived!": "अचानक मेहमान आ गए!",
    "Make some tea and snacks for them.": "उनके लिए कुछ चाय और नाश्ता बनाओ।"
  };

  const gameContentTranslationsKn: any = {
    // RememberMatch
    "Tea Kettle": "ಚಹಾ ಕೆಟಲ್",
    "Tea Cup": "ಚಹಾ ಕಪ್",
    "Cooking Pot": "ಅಡುಗೆ ಪಾತ್ರೆ",
    "Pressure Cooker": "ಪ್ರೆಶರ್ ಕುಕ್ಕರ್",
    "Serving Spoon": "ಬಡಿಸುವ ಚಮಚ",
    "Salt": "ಉಪ್ಪು",
    "Bowl": "ಬೌಲ್",
    "Pickle Jar": "ಉಪ್ಪಿನಕಾಯಿ ಜಾರ್",

    "Coconut": "ತೆಂಗಿನಕಾಯಿ",
    "Banana": "ಬಾಳೆಹಣ್ಣು",
    "Mango": "ಮಾವು",
    "Rice": "ಅಕ್ಕಿ",
    "Tomato": "ಟೊಮೆಟೊ",
    "Onion": "ಈರುಳ್ಳಿ",
    "Lime": "ನಿಂಬೆಹಣ್ಣು",
    "Apple": "ಸೇಬು",
    "Grapes": "ದ್ರಾಕ್ಷಿ",
    "Orange": "ಕಿತ್ತಳೆ",

    "Marigold": "ಚೆಂಡು ಹೂವು",
    "Jasmine": "ಮಲ್ಲಿಗೆ",
    "Tulsi": "ತುಳಸಿ",
    "Rose": "ಗುಲಾಬಿ",
    "Sunflower": "ಸೂರ್ಯಕಾಂತಿ",
    "Lotus": "ಕಮಲ",
    "Tulip": "ಟುಲಿಪ್",
    "Seedling": "ಸಸಿ",

    "Sparrow": "ಗುಬ್ಬಚ್ಚಿ",
    "Peacock": "ನವಿಲು",
    "Cow": "ಹಸು",
    "Cat": "ಬೆಕ್ಕು",
    "Dog": "ನಾಯಿ",
    "Parrot": "ಗಿಳಿ",
    "Butterfly": "ಚಿಟ್ಟೆ",
    "Elephant": "ಆನೆ",

    "Diya": "ದೀಪ (Diya)",
    "Temple Bell": "ದೇವಾಲಯದ ಗಂಟೆ",
    "Umbrella": "ಛತ್ರಿ",
    "Clock": "ಗಡಿಯಾರ",
    "Books": "ಪುಸ್ತಕಗಳು",
    "Lamp": "ದೀಪ",
    "Bag": "ಚೀಲ",
    "Remote": "ರಿಮೋಟ್",

    "Which of these was in the game?": "ಇವುಗಳಲ್ಲಿ ಯಾವುದು ಆಟದಲ್ಲಿತ್ತು?",

    // SpotFocus
    "Coffee Cup": "ಕಾಫಿ ಕಪ್",
    "Frying Pan": "ಫ್ರೈಯಿಂಗ್ ಪ್ಯಾನ್",
    "Soup Spoon": "ಸೂಪ್ ಚಮಚ",
    "Pepper": "ಮೆಣಸು",
    "Plate": "ಪ್ಲೇಟ್",
    "Jam Jar": "ಜಾಮ್ ಜಾರ್",

    "Pineapple": "ಅನಾನಸ್",
    "Watermelon": "ಕಲ್ಲಂಗಡಿ",

    "Lemon": "ನಿಂಬೆ",
    "Strawberry": "ಸ್ಟ್ರಾಬೆರಿ",
    "Garlic": "ಬೆಳ್ಳುಳ್ಳಿ",
    "Carrot": "ಗಜ್ಜರಿ",

    "Pigeon": "ಪಾರಿವಾಳ",
    "Swan": "ಹಂಸ",
    "Horse": "ಕುದುರೆ",
    "Tiger": "ಹುಲಿ",
    "Rabbit": "ಮೊಲ",

    "Lily": "ನೈದಿಲೆ",
    "Cactus": "ಪಾಪಾಸುಕಳ್ಳಿ",

    "Bicycle": "ಸೈಕಲ್",
    "Wrist Watch": "ಕೈಗಡಿಯಾರ",
    "Newspaper": "ಸುದ್ದಿಪತ್ರಿಕೆ",
    "Candle": "ಮೇಣದ ಬತ್ತಿ",
    "Purse": "ಪರ್ಸ್",
    "Phone": "ಫೋನ್",

    "Grandma with coffee": "ಕಾಫಿ ಜೊತೆ ಅಜ್ಜಿ",
    "Grandma with tea": "ಚಹಾ ಜೊತೆ ಅಜ್ಜಿ",
    "Grandpa reading": "ಓದುತ್ತಿರುವ ಅಜ್ಜ",
    "Grandpa sleeping": "ಮಲಗಿರುವ ಅಜ್ಜ",
    "Wall clock": "ಗೋಡೆ ಗಡಿಯಾರ",
    "Wall painting": "ಗೋಡೆ ಚಿತ್ರ",

    "Plant in a red pot": "ಕೆಂಪು ಕುಂಡದಲ್ಲಿ ಸಸ್ಯ",
    "Plant in a blue pot": "ನೀಲಿ ಕುಂಡದಲ್ಲಿ ಸಸ್ಯ",
    "Cushion (red)": "ಕುಶನ್ (ಕೆಂಪು)",
    "Cushion (blue)": "ಕುಶನ್ (ನೀಲಿ)",
    "Small rug": "ಸಣ್ಣ ಕಂಬಳಿ",
    "Large rug": "ದೊಡ್ಡ ಕಂಬಳಿ",

    "A beautiful quiet garden": "ಸುಂದರವಾದ ಶಾಂತ ಉದ್ಯಾನ",
    "A cozy living room": "ಆರಾಮದಾಯಕ ಲಿವಿಂಗ್ ರೂಮ್",

    // Morning Routine
    "Morning Routine": "ಬೆಳಗಿನ ದಿನಚರಿ",
    "Help plan your morning.": "ನಿಮ್ಮ ಬೆಳಗಿನ ಯೋಜನೆಗೆ ಸಹಾಯ ಮಾಡಿ.",
    "Wake up": "ಎದ್ದೇಳು",
    "Start the morning": "ಬೆಳಿಗ್ಗೆ ಪ್ರಾರಂಭಿಸಿ",
    "Brush teeth": "ಹಲ್ಲು ಉಜ್ಜುವುದು",
    "Fresh and clean": "ತಾಜಾ ಮತ್ತು ಸ್ವಚ್ಛ",
    "Eat breakfast": "ತಿಂಡಿ ತಿನ್ನು",
    "Idli or upma": "ಇಡ್ಲಿ ಅಥವಾ ಉಪ್ಪಿಟ್ಟು",
    "Drink chai": "ಚಹಾ ಕುಡಿಯಿರಿ",
    "Sit and relax": "ಕುಳಿತು ವಿಶ್ರಮಿಸಿ",
    "Read newspaper": "ಪತ್ರಿಕೆ ಓದಿ",
    "Catch up on news": "ಸುದ್ದಿಯನ್ನು ಓದಿ",

    "Get Dressed": "ಬಟ್ಟೆ ಧರಿಸಿ",
    "Choose clothes": "ಬಟ್ಟೆಗಳನ್ನು ಆಯ್ಕೆಮಾಡಿ",
    "Make Bed": "ಹಾಸಿಗೆಯ ಮಡಚು",
    "Tidy room": "ಸ್ವಚ್ಛವಾದ ಕೊಠಡಿ",

    "Evening Walk": "ಸಂಜೆಯ ನಡಿಗೆ",
    "A refreshing evening walk.": "ಉಲ್ಲಾಸಕರ ಸಂಜೆಯ ನಡಿಗೆ.",
    "Wear shoes": "ಶೂಗಳನ್ನು ಧರಿಸಿ",
    "Ready for walking": "ನಡೆಯಲು ಸಿದ್ಧ",
    "Lock door": "ಬಾಗಿಲು ಲಾಕ್ ಮಾಡಿ",
    "Secure the house": "ಮನೆಯನ್ನು ಸುರಕ್ಷಿತವಾಗಿರಿಸಿಕೊಳ್ಳಿ",
    "Take umbrella": "ಛತ್ರಿ ತೆಗೆದುಕೊಳ್ಳಿ",
    "In case of rain": "ಮಳೆಯ ಸಂದರ್ಭದಲ್ಲಿ",
    "Walk to park": "ಪಾರ್ಕ್ಗೆ ನಡೆಯಿರಿ",
    "Enjoy the breeze": "ಗಾಳಿಯನ್ನು ಆನಂದಿಸಿ",

    "Gardening Time": "ತೋಟಗಾರಿಕೆ ಸಮಯ",
    "Taking care of your plants.": "ನಿಮ್ಮ ಸಸ್ಯಗಳನ್ನು ನೋಡಿಕೊಳ್ಳುವುದು.",
    "Get watering can": "ನೀರಿನ ಕ್ಯಾನ್ ಪಡೆಯಿರಿ",
    "Fill with water": "ನೀರಿನಿಂದ ತುಂಬಿಸಿ",
    "Water plants": "ಸಸ್ಯಗಳಿಗೆ ನೀರುಣಿಸಿ",
    "Nourish them": "ಅಗತ್ಯ ಪೋಷಕಾಂಶ ನೀಡಿ",
    "Pluck dry leaves": "ಒಣಗಿದ ಎಲೆಗಳನ್ನು ಕೀಳಲು",
    "Keep plants healthy": "ಸಸ್ಯಗಳನ್ನು ಆರೋಗ್ಯವಾಗಿಡಿ",

    "Preparing Lunch": "ಮಧ್ಯಾಹ್ನದ ಊಟ ತಯಾರಿಸುವುದು",
    "Cooking a simple meal.": "ಸರಳವಾದ ಅಡುಗೆ.",
    "Wash vegetables": "ತರಕಾರಿಗಳನ್ನು ತೊಳೆಯಿರಿ",
    "Clean thoroughly": "ಸಂಪೂರ್ಣವಾಗಿ ಸ್ವಚ್ಛಗೊಳಿಸಿ",
    "Chop vegetables": "ತರಕಾರಿಗಳನ್ನು ಕತ್ತರಿಸಿ",
    "Fine pieces": "ಸಣ್ಣ ತುಂಡುಗಳು",
    "Cook rice": "ಅಕ್ಕಿಯನ್ನು ಬೇಯಿಸಿ",
    "Soft and fluffy": "ಮೃದುವಾದ ಅನ್ನ",
    "Make dal": "ದಾಲ್ ಮಾಡಿ",
    "Add spices": "ಮಸಾಲೆಗಳನ್ನು ಸೇರಿಸಿ",

    "Getting Ready for Bed": "ಮಲಗಲು ತಯಾರಾಗುವುದು",
    "Winding down for the night.": "ರಾತ್ರಿಯ ವಿಶ್ರಾಂತಿ.",
    "Lock main door": "ಮುಖ್ಯ ಬಾಗಿಲನ್ನು ಲಾಕ್ ಮಾಡಿ",
    "Safety first": "ಮೊದಲು ಸುರಕ್ಷತೆ",
    "Turn off lights": "ದೀಪಗಳನ್ನು ಆಫ್ ಮಾಡಿ",
    "Save electricity": "ವಿಧ್ಯುತ್ ಉಳಿಸಿ",
    "Drink warm milk": "ಬಿಸಿ ಹಾಲು ಕುಡಿಯಿರಿ",
    "Sleep well": "ಚೆನ್ನಾಗಿ ನಿದ್ರೆ ಮಾಡಿ",

    "Going to the Market": "ಮಾರುಕಟ್ಟೆಗೆ ಹೋಗುವುದು",
    "Buying fresh produce.": "ತಾಜಾ ಉತ್ಪನ್ನಗಳನ್ನು ಖರೀದಿಸುವುದು.",
    "Take shopping bag": "ಶಾಪಿಂಗ್ ಬ್ಯಾಗ್ ತೆಗೆದುಕೊಳ್ಳಿ",
    "Cloth bag": "ಬಟ್ಟೆ ಚೀಲ",
    "Check wallet": "ಪರ್ಸ್ (Wallet) ಪರಿಶೀಲಿಸಿ",
    "Keep cash ready": "ಹಣವನ್ನು ಸಿದ್ಧವಾಗಿಡಿ",
    "Buy vegetables": "ತರಕಾರಿಗಳನ್ನು ಖರೀದಿಸಿ",
    "Fresh and green": "ತಾಜಾ ಮತ್ತು ಹಸಿರು",
    "Buy fruits": "ಹಣ್ಣುಗಳನ್ನು ಖರೀದಿಸಿ",
    "Sweet and ripe": "ಸಿಹಿ ಮತ್ತು ಮಾಗಿದ",

    "Visiting the Doctor": "ವೈದ್ಯರ ಭೇಟಿ",
    "Routine check up.": "ನಿಯಮಿತ ತಪಾಸಣೆ.",
    "Take medical file": "ವೈದ್ಯಕೀಯ ಫೈಲ್ ತೆಗೆದುಕೊಳ್ಳಿ",
    "Previous records": "ಹಿಂದಿನ ದಾಖಲೆಗಳು",
    "Book cab": "ಕ್ಯಾಬ್ ಬುಕ್ ಮಾಡಿ",
    "Reach on time": "ಸಮಯಕ್ಕೆ ಸರಿಯಾಗಿ ತಲುಪಿ",
    "Wait in clinic": "ಕ್ಲಿನಿಕ್‌ನಲ್ಲಿ ಕಾಯಿರಿ",
    "Read a magazine": "ಮ್ಯಾಗಜಿನ್ ಓದಿ",
    "Consult doctor": "ವೈದ್ಯರನ್ನು ಸಂಪರ್ಕಿಸಿ",
    "Discuss health": "ಆರೋಗ್ಯದ ಬಗ್ಗೆ ಚರ್ಚಿಸಿ",

    "It's raining outside!": "ಹೊರಗಡೆ ಮಳೆಯಾಗುತ್ತಿದೆ!",
    "Do you take an umbrella or wear a raincoat?": "ನೀವು ಛತ್ರಿಯನ್ನು ತೆಗೆದುಕೊಳ್ಳುತ್ತೀರಾ ಅಥವಾ ರೇನ್‌ಕೋಟ್ ಧರಿಸುತ್ತೀರಾ?",
    "Take umbrella": "ಛತ್ರಿ ತೆಗೆದುಕೊಳ್ಳಿ",
    "Wear raincoat": "ರೇನ್‌ಕೋಟ್ ಧರಿಸಿ",

    "Your friend calls and asks to join you.": "ನಿಮ್ಮ ಸ್ನೇಹಿತ ಕರೆ ಮಾಡಿ ನಿಮ್ಮೊಂದಿಗೆ ಸೇರಲು ಕೇಳುತ್ತಾನೆ.",
    "Do you wait for them or start walking?": "ನೀವು ಅವರಿಗಾಗಿ ಕಾಯುತ್ತೀರಾ ಅಥವಾ ನಡೆಯಲು ಪ್ರಾರಂಭಿಸುತ್ತೀರಾ?",
    "Wait for friend": "ಸ್ನೇಹಿತನಿಗಾಗಿ ಕಾಯಿರಿ",
    "Start walking": "ನಡೆಯಲು ಪ್ರಾರಂಭಿಸಿ",

    "The store ran out of your favorite biscuits.": "ನಿಮ್ಮ ನೆಚ್ಚಿನ ಬಿಸ್ಕತ್ತುಗಳು ಅಂಗಡಿಯಲ್ಲಿ ಖಾಲಿಯಾಗಿವೆ.",
    "Do you buy another brand or go without?": "ನೀವು ಇನ್ನೊಂದು ಬ್ರಾಂಡ್ ಅನ್ನು ಖರೀದಿಸುತ್ತೀರಾ ಅಥವಾ ಇಲ್ಲದೆ ಹೋಗುತ್ತೀರಾ?",
    "Buy another brand": "ಇನ್ನೊಂದು ಬ್ರಾಂಡ್ ಖರೀದಿಸಿ",
    "Go without": "ಖರೀದಿಸದೆ ಹೋಗು",

    "You feel a bit tired today.": "ನೀವು ಇಂದು ಸ್ವಲ್ಪ ದಣಿದಿದ್ದೀರಿ.",
    "Do you rest longer or do a light version?": "ನೀವು ಹೆಚ್ಚು ಕಾಲ ವಿಶ್ರಾಂತಿ ಪಡೆಯುತ್ತೀರಾ ಅಥವಾ ಲಘು ಆವೃತ್ತಿಯನ್ನು ಮಾಡುತ್ತೀರಾ?",
    "Rest longer": "ಉದ್ದವಾದ ವಿಶ್ರಾಂತಿ",
    "Do light version": "ಲಘು ಆವೃತ್ತಿಯನ್ನು ಮಾಡಿ",

    "A power cut happens suddenly!": "ಅಕಸ್ಮಾತ್ ವಿದ್ಯುತ್ ಕಡಿತವಾಗುತ್ತದೆ!",
    "Do you light a candle or turn on the emergency lamp?": "ನೀವು ಮೇಣದಬತ್ತಿಯನ್ನು ಬೆಳಗಿಸುತ್ತೀರಾ ಅಥವಾ ತುರ್ತು ದೀಪವನ್ನು ಆನ್ ಮಾಡುತ್ತೀರಾ?",
    "Light candle": "ಮೇಣದಬತ್ತಿಯನ್ನು ಬೆಳಗಿಸಿ",
    "Turn on emergency lamp": "ತುರ್ತು ದೀಪವನ್ನು ಆನ್ ಮಾಡಿ",

    "You forgot an item at the store.": "ನೀವು ಅಂಗಡಿಯಲ್ಲಿ ಒಂದು ವಸ್ತುವನ್ನು ಮರೆತಿದ್ದೀರಿ.",
    "Do you go back for it or adjust without it?": "ನೀವು ಅದಕ್ಕಾಗಿ ಹಿಂತಿರುಗುತ್ತೀರಾ ಅಥವಾ ಅದು ಇಲ್ಲದೆ ಸರಿಹೊಂದಿಸುತ್ತೀರಾ?",
    "Go back": "ಹಿಂತಿರುಗು",
    "Adjust without it": "ಅದಿಲ್ಲದೆ ಹೊಂದಿಸಿ",

    "The milk boiled over!": "ಹಾಲು ಕುದಿಯಿತು!",
    "Clean the stove before sitting down.": "ಕುಳಿತುಕೊಳ್ಳುವ ಮೊದಲು ಒಲೆಯನ್ನು ಸ್ವಚ್ಛಗೊಳಿಸಿ.",

    "A stray dog is blocking the gate!": "ಬೀದಿ ನಾಯಿಯೊಂದು ದ್ವಾರವನ್ನು ತಡೆಯುತ್ತಿದೆ!",
    "Wait patiently for it to leave.": "ಅದು ಹೋಗಲು ತಾಳ್ಮೆಯಿಂದ ಕಾಯಿರಿ.",

    "You knocked over a potted plant!": "ನೀವು ಒಂದು ಕುಂಡದ ಸಸ್ಯವನ್ನು ಕೆಡವಿದ್ದೀರಿ!",
    "Repot it and clean the mess.": "ಅದನ್ನು ಮರು-ಮಡಿಕೆ ಮಾಡಿ ಮತ್ತು ಗೊಂದಲವನ್ನು ಸ್ವಚ್ಛಗೊಳಿಸಿ.",
    
    "Unexpected guests arrived!": "ಅನಿರೀಕ್ಷಿತ ಅತಿಥಿಗಳು ಬಂದರು!",
    "Make some tea and snacks for them.": "ಅವರಿಗಾಗಿ ಸ್ವಲ್ಪ ಚಹಾ ಮತ್ತು ತಿಂಡಿಗಳನ್ನು ಮಾಡಿ."
  };

  const finalHi = { ...hiData, ...gameContentTranslationsHi };
  const finalKn = { ...knData, ...gameContentTranslationsKn };

  // Sync English with the exact same keys representing the english phrases:
  const gameContentTranslationsEn: any = {};
  for (const key of Object.keys(gameContentTranslationsHi)) {
    gameContentTranslationsEn[key] = key;
  }
  const finalEn = { ...enData, ...gameContentTranslationsEn };

  fs.writeFileSync(hiPath, JSON.stringify(finalHi, null, 2), 'utf8');
  fs.writeFileSync(knPath, JSON.stringify(finalKn, null, 2), 'utf8');
  fs.writeFileSync(enPath, JSON.stringify(finalEn, null, 2), 'utf8');
}

run();
