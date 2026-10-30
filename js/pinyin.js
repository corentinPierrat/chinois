// Every valid Mandarin syllable (ü written as u after j/q/x/y, so also 'u' forms).
const SYL = new Set(
  (
    "a o e ai ei ao ou an en ang eng er " +
    "ba bo bai bei bao ban ben bang beng bi bie biao bian bin bing bu " +
    "pa po pai pei pao pou pan pen pang peng pi pie piao pian pin ping pu " +
    "ma mo me mai mei mao mou man men mang meng mi mie miao miu mian min ming mu " +
    "fa fo fei fou fan fen fang feng fu " +
    "da de dai dei dao dou dan den dang deng dong di die diao diu dian ding du duo dui duan dun " +
    "ta te tai tao tou tan tang teng tong ti tie tiao tian ting tu tuo tui tuan tun " +
    "na ne nai nei nao nou nan nen nang neng nong ni nie niao niu nian nin niang ning nu nuo nuan nü nüe " +
    "la le lai lei lao lou lan lang leng long li lia lie liao liu lian lin liang ling lu luo luan lun lü lüe " +
    "ga ge gai gei gao gou gan gen gang geng gong gu gua guo guai gui guan gun guang " +
    "ka ke kai kei kao kou kan ken kang keng kong ku kua kuo kuai kui kuan kun kuang " +
    "ha he hai hei hao hou han hen hang heng hong hu hua huo huai hui huan hun huang " +
    "ji jia jie jiao jiu jian jin jiang jing jiong ju jue juan jun " +
    "qi qia qie qiao qiu qian qin qiang qing qiong qu que quan qun " +
    "xi xia xie xiao xiu xian xin xiang xing xiong xu xue xuan xun " +
    "zha zhe zhi zhai zhei zhao zhou zhan zhen zhang zheng zhong zhu zhua zhuo zhuai zhui zhuan zhun zhuang " +
    "cha che chi chai chao chou chan chen chang cheng chong chu chua chuo chuai chui chuan chun chuang " +
    "sha she shi shai shei shao shou shan shen shang sheng shu shua shuo shuai shui shuan shun shuang " +
    "re ri rao rou ran ren rang reng rong ru rua ruo rui ruan run " +
    "za ze zi zai zei zao zou zan zen zang zeng zong zu zuo zui zuan zun " +
    "ca ce ci cai cao cou can cen cang ceng cong cu cuo cui cuan cun " +
    "sa se si sai sao sou san sen sang seng song su suo sui suan sun " +
    "ya yo ye yi yao you yan yin yang ying yong yu yue yuan yun " +
    "wa wo wu wai wei wan wen wang weng"
  ).split(" ")
);
const MAXLEN = 6;

const TONE_MARKS = { "̄": 1, "́": 2, "̌": 3, "̀": 4 };

// Returns [{ch (lowercase base char, ü kept), tone (0 if none), orig}] for one letter.
function decompose(c) {
  const d = c.normalize("NFD");
  let base = d[0];
  let tone = 0;
  let uml = false;
  for (const m of d.slice(1)) {
    if (m in TONE_MARKS) tone = TONE_MARKS[m];
    else if (m === "̈") uml = true;
  }
  if (uml && base.toLowerCase() === "u") base = base === "U" ? "Ü" : "ü";
  return { ch: base.toLowerCase(), tone };
}

function segment(chars, from = 0) {
  if (from === chars.length) return [];
  const max = Math.min(MAXLEN, chars.length - from);
  for (let len = max; len >= 1; len--) {
    const s = chars.slice(from, from + len).map((x) => x.ch).join("");
    if (SYL.has(s)) {
      const rest = segment(chars, from + len);
      if (rest) return [[from, from + len], ...rest];
    }
  }
  return null;
}

export function syllables(pinyin) {
  const out = [];
  const chunks = String(pinyin).replace(/\/\S*/g, "").match(/\p{L}[\p{L}\p{M}]*/gu) || [];
  for (const chunk of chunks) {
    const letters = [...chunk.normalize("NFC")];
    // Skip Latin acronyms such as "AI" (all caps, 2+ letters).
    if (letters.length > 1 && letters.every((c) => c === c.toUpperCase() && c !== c.toLowerCase())) continue;
    const chars = letters.map(decompose);
    let spans = segment(chars);
    if (!spans && chars.length > 1 && chars[chars.length - 1].ch === "r") {
      // erhua: trailing "r" is its own syllable (matches the 儿 character)
      const head = segment(chars.slice(0, -1));
      if (head) spans = [...head, [chars.length - 1, chars.length]];
    }
    spans = spans || [[0, chars.length]];
    for (const [a, b] of spans) {
      const slice = chars.slice(a, b);
      const tone = slice.find((x) => x.tone)?.tone || 5;
      const text = letters.slice(a, b).join("").toLowerCase();
      out.push({ text, base: slice.map((x) => x.ch).join(""), tone });
    }
  }
  return out;
}
