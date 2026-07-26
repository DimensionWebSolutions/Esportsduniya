/**
 * Daily sports quiz — curated question bank plus deterministic daily selection.
 *
 * Everything here is static so the quiz works with zero API keys and returns the
 * same five questions to every fan on a given day (which is what makes scores
 * comparable on the leaderboard).
 */

export const QUIZ_LENGTH = 5;

/** Points awarded per correct answer, plus a bonus for a clean sweep. */
export const POINTS_PER_CORRECT = 10;
export const PERFECT_ROUND_BONUS = 25;

/** India Standard Time is UTC+5:30 — the quiz day rolls over at midnight IST. */
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export const QUIZ_QUESTIONS = [
  // ── Cricket ──
  {
    id: 'cr-1975-wc',
    sport: 'cricket',
    difficulty: 'easy',
    question: 'Which team won the first men’s Cricket World Cup in 1975?',
    options: ['Australia', 'West Indies', 'England', 'India'],
    answer: 1,
    explanation: 'West Indies beat Australia in the Lord’s final, with Clive Lloyd scoring 102. They won the next edition in 1979 too.',
  },
  {
    id: 'cr-1983-captain',
    sport: 'cricket',
    difficulty: 'easy',
    question: 'Who captained India to their first World Cup title in 1983?',
    options: ['Sunil Gavaskar', 'Kapil Dev', 'Mohinder Amarnath', 'Bishan Singh Bedi'],
    answer: 1,
    explanation: 'Kapil Dev’s side defended just 183 against West Indies at Lord’s — the upset that turned cricket into India’s national obsession.',
  },
  {
    id: 'cr-bradman-avg',
    sport: 'cricket',
    difficulty: 'medium',
    question: 'What was Don Bradman’s Test batting average?',
    options: ['89.78', '94.50', '99.94', '101.20'],
    answer: 2,
    explanation: 'Bradman finished on 99.94 from 52 Tests. He needed four runs in his final innings to average 100 and was dismissed for nought.',
  },
  {
    id: 'cr-most-runs',
    sport: 'cricket',
    difficulty: 'easy',
    question: 'Who has scored the most runs in international cricket?',
    options: ['Ricky Ponting', 'Sachin Tendulkar', 'Virat Kohli', 'Kumar Sangakkara'],
    answer: 1,
    explanation: 'Tendulkar totalled over 34,000 runs across Tests, ODIs and T20Is, including a record 100 international centuries.',
  },
  {
    id: 'cr-t20-overs',
    sport: 'cricket',
    difficulty: 'easy',
    question: 'How many overs does each side bowl in a standard T20 match?',
    options: ['15', '20', '25', '50'],
    answer: 1,
    explanation: 'Twenty overs a side, which is why the format is called T20. A tie is usually settled with a Super Over.',
  },
  {
    id: 'cr-800-wickets',
    sport: 'cricket',
    difficulty: 'medium',
    question: 'Which bowler finished his career with a record 800 Test wickets?',
    options: ['Shane Warne', 'Anil Kumble', 'Muttiah Muralitharan', 'James Anderson'],
    answer: 2,
    explanation: 'Sri Lanka’s Muttiah Muralitharan took his 800th wicket in his final Test in 2010 — the last ball he bowled at that level.',
  },
  {
    id: 'cr-lords',
    sport: 'cricket',
    difficulty: 'easy',
    question: 'Which ground is known as the “Home of Cricket”?',
    options: ['Melbourne Cricket Ground', 'Lord’s', 'Eden Gardens', 'The Oval'],
    answer: 1,
    explanation: 'Lord’s in London, opened in 1814 and owned by the MCC, is cricket’s spiritual home and famous for its sloping outfield.',
  },
  {
    id: 'cr-first-odi-200',
    sport: 'cricket',
    difficulty: 'medium',
    question: 'Who scored the first double century in men’s ODI cricket?',
    options: ['Virender Sehwag', 'Rohit Sharma', 'Sachin Tendulkar', 'Chris Gayle'],
    answer: 2,
    explanation: 'Tendulkar made 200 not out against South Africa at Gwalior in February 2010, breaking a 39-year wait for an ODI 200.',
  },
  {
    id: 'cr-lbw',
    sport: 'cricket',
    difficulty: 'easy',
    question: 'In cricket, what does LBW stand for?',
    options: ['Left Bat Wicket', 'Leg Before Wicket', 'Long Ball Wide', 'Late Bowled Wicket'],
    answer: 1,
    explanation: 'Leg Before Wicket: the batter is out if the ball would have hit the stumps but struck their body first, subject to pitch and impact rules.',
  },
  {
    id: 'cr-2011-final',
    sport: 'cricket',
    difficulty: 'medium',
    question: 'Which side did India beat in the 2011 World Cup final at the Wankhede?',
    options: ['Australia', 'Pakistan', 'Sri Lanka', 'South Africa'],
    answer: 2,
    explanation: 'India chased 275 against Sri Lanka, sealed by MS Dhoni’s six — the first time a host nation won a men’s World Cup final.',
  },
  {
    id: 'cr-six-sixes',
    sport: 'cricket',
    difficulty: 'medium',
    question: 'Who hit six sixes in one over at the 2007 T20 World Cup?',
    options: ['MS Dhoni', 'Yuvraj Singh', 'Herschelle Gibbs', 'Kieron Pollard'],
    answer: 1,
    explanation: 'Yuvraj Singh took 36 off a Stuart Broad over against England at Durban, then reached his fifty in 12 balls.',
  },
  {
    id: 'cr-ipl-playoffs',
    sport: 'cricket',
    difficulty: 'medium',
    question: 'How many IPL teams reach the playoffs each season?',
    options: ['Two', 'Four', 'Six', 'Eight'],
    answer: 1,
    explanation: 'The top four qualify. The top two get two shots at reaching the final via Qualifier 1, while third and fourth must survive the Eliminator.',
  },

  // ── Football ──
  {
    id: 'fb-most-wc',
    sport: 'football',
    difficulty: 'easy',
    question: 'Which country has won the most FIFA World Cups?',
    options: ['Germany', 'Italy', 'Brazil', 'Argentina'],
    answer: 2,
    explanation: 'Brazil have five titles (1958, 1962, 1970, 1994, 2002) and are the only nation to have played in every World Cup.',
  },
  {
    id: 'fb-ucl-most',
    sport: 'football',
    difficulty: 'easy',
    question: 'Which club has won the most European Cup / Champions League titles?',
    options: ['AC Milan', 'Liverpool', 'Bayern Munich', 'Real Madrid'],
    answer: 3,
    explanation: 'Real Madrid have won it 15 times, including the first five editions from 1956 to 1960.',
  },
  {
    id: 'fb-ballon-dor',
    sport: 'football',
    difficulty: 'medium',
    question: 'Who has won a record eight Ballon d’Or awards?',
    options: ['Cristiano Ronaldo', 'Lionel Messi', 'Michel Platini', 'Johan Cruyff'],
    answer: 1,
    explanation: 'Messi won his eighth in 2023 after leading Argentina to the World Cup. Cristiano Ronaldo is next with five.',
  },
  {
    id: 'fb-2022-wc',
    sport: 'football',
    difficulty: 'easy',
    question: 'Who won the 2022 FIFA World Cup in Qatar?',
    options: ['France', 'Argentina', 'Croatia', 'Morocco'],
    answer: 1,
    explanation: 'Argentina beat France 4-2 on penalties after a 3-3 final, with Kylian Mbappé scoring a hat-trick in defeat.',
  },
  {
    id: 'fb-epl-scorer',
    sport: 'football',
    difficulty: 'medium',
    question: 'Who is the Premier League’s all-time leading goalscorer?',
    options: ['Wayne Rooney', 'Harry Kane', 'Alan Shearer', 'Thierry Henry'],
    answer: 2,
    explanation: 'Alan Shearer scored 260 Premier League goals for Blackburn and Newcastle between 1992 and 2006.',
  },
  {
    id: 'fb-invincibles',
    sport: 'football',
    difficulty: 'hard',
    question: 'Which club went unbeaten through a 38-game Premier League season?',
    options: ['Manchester United', 'Chelsea', 'Arsenal', 'Manchester City'],
    answer: 2,
    explanation: 'Arsenal’s “Invincibles” won 26 and drew 12 in 2003-04 under Arsène Wenger — still the only unbeaten 38-game top-flight season in England.',
  },
  {
    id: 'fb-extra-time',
    sport: 'football',
    difficulty: 'easy',
    question: 'How long is extra time in a knockout football match?',
    options: ['10 minutes', '20 minutes', '30 minutes', '45 minutes'],
    answer: 2,
    explanation: 'Two halves of 15 minutes. If the tie is still level, it goes to a penalty shootout.',
  },
  {
    id: 'fb-xg',
    sport: 'football',
    difficulty: 'medium',
    question: 'What does the football metric “xG” measure?',
    options: [
      'Total distance covered by a team',
      'How likely a shot was to be scored',
      'Extra goals awarded in extra time',
      'A goalkeeper’s save percentage',
    ],
    answer: 1,
    explanation: 'Expected goals rate each chance from 0 to 1 based on factors like distance, angle and assist type. Outscoring your xG usually means clinical finishing or luck.',
  },

  // ── Basketball ──
  {
    id: 'nba-2024-title',
    sport: 'nba',
    difficulty: 'medium',
    question: 'Which franchise won a record 18th NBA championship in 2024?',
    options: ['Los Angeles Lakers', 'Boston Celtics', 'Golden State Warriors', 'Chicago Bulls'],
    answer: 1,
    explanation: 'The Celtics beat Dallas in the 2024 Finals to move one clear of the Lakers on 18 titles.',
  },
  {
    id: 'nba-game-length',
    sport: 'nba',
    difficulty: 'easy',
    question: 'How long is a standard NBA game?',
    options: ['40 minutes', '48 minutes', '60 minutes', '90 minutes'],
    answer: 1,
    explanation: 'Four 12-minute quarters. College basketball and FIBA games are shorter, and NBA overtime periods run five minutes each.',
  },
  {
    id: 'nba-100-points',
    sport: 'nba',
    difficulty: 'medium',
    question: 'Who scored a record 100 points in a single NBA game?',
    options: ['Kobe Bryant', 'Michael Jordan', 'Wilt Chamberlain', 'Devin Booker'],
    answer: 2,
    explanation: 'Wilt Chamberlain did it for Philadelphia against New York in 1962. Kobe Bryant’s 81 in 2006 is the closest anyone has come since.',
  },
  {
    id: 'nba-scoring-leader',
    sport: 'nba',
    difficulty: 'easy',
    question: 'Who became the NBA’s all-time leading scorer in 2023?',
    options: ['Kevin Durant', 'LeBron James', 'Stephen Curry', 'Kareem Abdul-Jabbar'],
    answer: 1,
    explanation: 'LeBron James passed Kareem Abdul-Jabbar’s 38,387 points in February 2023, a record that had stood since 1984.',
  },
  {
    id: 'nba-three-point',
    sport: 'nba',
    difficulty: 'easy',
    question: 'How many points is a successful shot from behind the arc worth?',
    options: ['Two', 'Three', 'Four', 'Depends on distance'],
    answer: 1,
    explanation: 'Three points. The NBA added the line in 1979-80, and it now shapes almost every offensive scheme in the league.',
  },

  // ── Formula 1 ──
  {
    id: 'f1-most-titles',
    sport: 'f1',
    difficulty: 'medium',
    question: 'Which two drivers share the record of seven F1 world titles?',
    options: [
      'Ayrton Senna and Alain Prost',
      'Michael Schumacher and Lewis Hamilton',
      'Sebastian Vettel and Max Verstappen',
      'Juan Manuel Fangio and Niki Lauda',
    ],
    answer: 1,
    explanation: 'Schumacher won five in a row with Ferrari from 2000; Hamilton matched his total in 2020 with Mercedes.',
  },
  {
    id: 'f1-monaco',
    sport: 'f1',
    difficulty: 'easy',
    question: 'The Monaco Grand Prix is run on what kind of track?',
    options: ['A purpose-built circuit', 'A street circuit', 'An oval', 'A rally stage'],
    answer: 1,
    explanation: 'It uses public roads around Monte Carlo, barely wider than the cars, which is why qualifying position matters so much there.',
  },
  {
    id: 'f1-chequered-flag',
    sport: 'f1',
    difficulty: 'easy',
    question: 'Which flag signals the end of a Formula 1 race?',
    options: ['Yellow flag', 'Red flag', 'Chequered flag', 'Blue flag'],
    answer: 2,
    explanation: 'The black-and-white chequered flag ends the session. Red stops it early, yellow warns of danger, and blue tells a driver to let a faster car pass.',
  },
  {
    id: 'f1-drs',
    sport: 'f1',
    difficulty: 'medium',
    question: 'In F1, what does DRS stand for?',
    options: ['Drag Reduction System', 'Direct Racing Start', 'Driver Rating Score', 'Dynamic Rear Suspension'],
    answer: 0,
    explanation: 'Opening a flap in the rear wing cuts drag for extra straight-line speed. It can only be used in designated zones when within one second of the car ahead.',
  },
  {
    id: 'f1-verstappen',
    sport: 'f1',
    difficulty: 'medium',
    question: 'Who won four consecutive F1 drivers’ championships from 2021 to 2024?',
    options: ['Charles Leclerc', 'Lewis Hamilton', 'Max Verstappen', 'Lando Norris'],
    answer: 2,
    explanation: 'Verstappen’s run started with the 2021 title decided on the last lap in Abu Dhabi and included a record 19 wins in 2023.',
  },

  // ── Tennis ──
  {
    id: 'tn-clay-slam',
    sport: 'tennis',
    difficulty: 'easy',
    question: 'Which Grand Slam is played on clay?',
    options: ['Wimbledon', 'US Open', 'French Open', 'Australian Open'],
    answer: 2,
    explanation: 'Roland-Garros in Paris is the only clay-court major. Rafael Nadal won it a staggering 14 times.',
  },
  {
    id: 'tn-most-slams-men',
    sport: 'tennis',
    difficulty: 'medium',
    question: 'Who holds the men’s record of 24 Grand Slam singles titles?',
    options: ['Roger Federer', 'Rafael Nadal', 'Novak Djokovic', 'Pete Sampras'],
    answer: 2,
    explanation: 'Djokovic reached 24 at the 2023 US Open, ahead of Nadal on 22 and Federer on 20.',
  },
  {
    id: 'tn-love',
    sport: 'tennis',
    difficulty: 'easy',
    question: 'In tennis scoring, what word means a score of zero?',
    options: ['Duck', 'Love', 'Nil', 'Blank'],
    answer: 1,
    explanation: 'A game starts at love-all, then moves 15, 30, 40, game. The term is thought to come from the French “l’oeuf”, meaning egg.',
  },
  {
    id: 'tn-grass-slam',
    sport: 'tennis',
    difficulty: 'easy',
    question: 'Which Grand Slam is still played on grass?',
    options: ['Wimbledon', 'French Open', 'US Open', 'Australian Open'],
    answer: 0,
    explanation: 'Wimbledon, first held in 1877, is the oldest tennis tournament in the world and the only major on grass.',
  },
  {
    id: 'tn-slam-count',
    sport: 'tennis',
    difficulty: 'easy',
    question: 'How many Grand Slam tournaments are held each year?',
    options: ['Three', 'Four', 'Six', 'Nine'],
    answer: 1,
    explanation: 'Australian Open, French Open, Wimbledon and US Open. Winning all four in one calendar year is a “Grand Slam”.',
  },

  // ── Multi-sport & India ──
  {
    id: 'ms-olympics-cycle',
    sport: 'multi',
    difficulty: 'easy',
    question: 'How often are the Summer Olympic Games held?',
    options: ['Every two years', 'Every three years', 'Every four years', 'Every five years'],
    answer: 2,
    explanation: 'Every four years, an interval known as an Olympiad. Winter Games run on the same cycle, offset by two years.',
  },
  {
    id: 'ms-paris-2024',
    sport: 'multi',
    difficulty: 'easy',
    question: 'Which city hosted the 2024 Summer Olympics?',
    options: ['Tokyo', 'Paris', 'Los Angeles', 'Rio de Janeiro'],
    answer: 1,
    explanation: 'Paris hosted for the third time after 1900 and 1924. Los Angeles is next in 2028.',
  },
  {
    id: 'ms-usain-bolt',
    sport: 'multi',
    difficulty: 'medium',
    question: 'What is Usain Bolt’s 100m world record time?',
    options: ['9.79s', '9.63s', '9.58s', '9.49s'],
    answer: 2,
    explanation: 'Bolt ran 9.58 seconds at the 2009 World Championships in Berlin, taking more than a tenth off his own record.',
  },
  {
    id: 'ms-neeraj',
    sport: 'multi',
    difficulty: 'medium',
    question: 'Which Indian won Olympic gold in the men’s javelin at Tokyo 2020?',
    options: ['Neeraj Chopra', 'Abhinav Bindra', 'Bajrang Punia', 'Devendra Jhajharia'],
    answer: 0,
    explanation: 'Neeraj Chopra’s 87.58m throw was India’s first Olympic gold in athletics and only its second individual gold overall.',
  },
  {
    id: 'ms-kabaddi',
    sport: 'multi',
    difficulty: 'medium',
    question: 'How many players from each team are on the mat in kabaddi?',
    options: ['Five', 'Six', 'Seven', 'Nine'],
    answer: 2,
    explanation: 'Seven a side. A raider crosses into the opposition half to touch defenders and must return without being tackled.',
  },
  {
    id: 'ms-badminton-21',
    sport: 'multi',
    difficulty: 'easy',
    question: 'How many points does it take to win a badminton game under rally scoring?',
    options: ['11', '15', '21', '25'],
    answer: 2,
    explanation: '21 points, and you must lead by two. If the score reaches 29-29, the next point wins.',
  },
  {
    id: 'ms-wankhede',
    sport: 'multi',
    difficulty: 'easy',
    question: 'Wankhede Stadium is in which Indian city?',
    options: ['Delhi', 'Kolkata', 'Mumbai', 'Chennai'],
    answer: 2,
    explanation: 'Mumbai. It hosted the 2011 World Cup final and is the home ground of the Mumbai Indians.',
  },
  {
    id: 'ms-hockey-players',
    sport: 'multi',
    difficulty: 'medium',
    question: 'How many players per side take the field in field hockey?',
    options: ['Nine', 'Ten', 'Eleven', 'Thirteen'],
    answer: 2,
    explanation: 'Eleven, including the goalkeeper. India won six straight Olympic hockey golds between 1928 and 1956.',
  },
];

function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFromKey(key) {
  let hash = 2166136261;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Quiz day in IST as YYYY-MM-DD. */
export function quizDateKey(date = new Date()) {
  return new Date(date.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

export function isValidDateKey(key) {
  return typeof key === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(key);
}

/**
 * Pick the questions for a given day. The same date always yields the same
 * questions, with at most two from any single sport so the round stays varied.
 */
export function getDailyQuiz(dateKey = quizDateKey()) {
  const random = mulberry32(seedFromKey(dateKey));
  const pool = [...QUIZ_QUESTIONS];

  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  const picked = [];
  const perSport = {};
  for (const question of pool) {
    if (picked.length === QUIZ_LENGTH) break;
    if ((perSport[question.sport] || 0) >= 2) continue;
    perSport[question.sport] = (perSport[question.sport] || 0) + 1;
    picked.push(question);
  }
  // Top up if the variety cap left the round short (only possible with a tiny bank).
  for (const question of pool) {
    if (picked.length === QUIZ_LENGTH) break;
    if (!picked.includes(question)) picked.push(question);
  }

  return { date: dateKey, questions: picked };
}

/** Question shape sent to the browser — answers stay on the server until submit. */
export function toPublicQuestion(question, index) {
  return {
    id: question.id,
    number: index + 1,
    sport: question.sport,
    difficulty: question.difficulty,
    question: question.question,
    options: question.options,
  };
}

/**
 * Grade a submission. `answers` maps question id → chosen option index; missing
 * or malformed entries simply count as wrong.
 */
export function gradeQuiz(dateKey, answers = {}) {
  const { questions } = getDailyQuiz(dateKey);
  const results = questions.map((question, index) => {
    const picked = Number.isInteger(answers?.[question.id]) ? answers[question.id] : null;
    return {
      id: question.id,
      number: index + 1,
      question: question.question,
      options: question.options,
      pickedIndex: picked,
      answerIndex: question.answer,
      correct: picked === question.answer,
      explanation: question.explanation,
    };
  });

  const score = results.filter(r => r.correct).length;
  const perfect = score === results.length && results.length > 0;

  return {
    date: dateKey,
    score,
    total: results.length,
    perfect,
    points: score * POINTS_PER_CORRECT + (perfect ? PERFECT_ROUND_BONUS : 0),
    results,
  };
}
