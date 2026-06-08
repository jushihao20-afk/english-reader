const els = {
  textInput: document.querySelector("#textInput"),
  renderButton: document.querySelector("#renderButton"),
  sampleButton: document.querySelector("#sampleButton"),
  clearButton: document.querySelector("#clearButton"),
  fileInput: document.querySelector("#fileInput"),
  dropZone: document.querySelector("#dropZone"),
  reader: document.querySelector("#reader"),
  voiceSelect: document.querySelector("#voiceSelect"),
  targetLang: document.querySelector("#targetLang"),
  rateRange: document.querySelector("#rateRange"),
  rateValue: document.querySelector("#rateValue"),
  readAllButton: document.querySelector("#readAllButton"),
  pauseButton: document.querySelector("#pauseButton"),
  stopButton: document.querySelector("#stopButton"),
  selectionBar: document.querySelector("#selectionBar"),
  selectionPreview: document.querySelector("#selectionPreview"),
  readSelectionButton: document.querySelector("#readSelectionButton"),
  statusDot: document.querySelector("#statusDot"),
  statusText: document.querySelector("#statusText"),
  wordCard: document.querySelector("#wordCard"),
  cardWord: document.querySelector("#cardWord"),
  wordLanguage: document.querySelector("#wordLanguage"),
  closeCardButton: document.querySelector("#closeCardButton"),
  speakWordButton: document.querySelector("#speakWordButton"),
  phoneticText: document.querySelector("#phoneticText"),
  definitionList: document.querySelector("#definitionList"),
  translationLabel: document.querySelector("#translationLabel"),
  translationSummary: document.querySelector("#translationSummary"),
  confidenceText: document.querySelector("#confidenceText")
};

const sampleText = `The best readers are not passive. They notice rhythm, pause at unfamiliar words, and test meaning against context.

When you read an English paragraph aloud, your ears can catch patterns that your eyes may miss. Try selecting only this sentence and listening to it once.

Curiosity is a practical skill. Each word you inspect becomes a small doorway into pronunciation, usage, and memory.`;

const fallbackDictionary = {
  learning: { translation: "学习；学问", byPart: { noun: "学习；学问", verb: "学习；了解；掌握" } },
  english: { translation: "英语；英国的；英文的", byPart: { noun: "英语", adjective: "英国的；英文的" } },
  reader: { translation: "读者；阅读器", byPart: { noun: "读者；阅读器；读本" } },
  reading: { translation: "阅读；读数；解读", byPart: { noun: "阅读；读数；解读", verb: "阅读；朗读" } },
  active: { translation: "主动的；活跃的", byPart: { adjective: "主动的；活跃的；有效的" } },
  become: { translation: "成为；变成；适合", byPart: { verb: "成为；变成；适合" } },
  select: { translation: "选择；精选的", byPart: { verb: "选择；挑选", adjective: "精选的；优秀的" } },
  hear: { translation: "听见；听说", byPart: { verb: "听见；听说；听取" } },
  feel: { translation: "感觉；觉得；触摸", byPart: { verb: "感觉；觉得；触摸", noun: "感觉；手感" } },
  click: { translation: "点击；咔嗒声", byPart: { verb: "点击；发出咔嗒声", noun: "点击；咔嗒声" } },
  open: { translation: "打开；开放的", byPart: { verb: "打开；开启", adjective: "开放的；敞开的" } },
  small: { translation: "小的；少量的", byPart: { adjective: "小的；少量的", noun: "小号；小件物品" } },
  card: { translation: "卡片；卡", byPart: { noun: "卡片；卡；纸牌", verb: "要求出示证件" } },
  sentence: { translation: "句子；判决；宣判", byPart: { noun: "句子；判决", verb: "宣判；判刑" } },
  aloud: { translation: "大声地；出声地", byPart: { adverb: "大声地；出声地" } },
  word: { translation: "单词；话语；消息", byPart: { noun: "单词；话语；消息", verb: "措辞；用词表达" } },
  dictionary: { translation: "字典；词典", byPart: { noun: "字典；词典" } },
  pronunciation: { translation: "发音；读音", byPart: { noun: "发音；读音" } },
  translation: { translation: "翻译；译文", byPart: { noun: "翻译；译文；转化" } },
  paragraph: { translation: "段落", byPart: { noun: "段落；短评", verb: "把...分段" } },
  curiosity: { translation: "好奇心；珍奇事物", byPart: { noun: "好奇心；珍奇事物" } },
  practical: { translation: "实用的；实际的", byPart: { adjective: "实用的；实际的；可行的" } },
  skill: { translation: "技能；技巧", byPart: { noun: "技能；技巧；熟练" } },
  context: { translation: "上下文；背景", byPart: { noun: "上下文；背景；语境" } },
  memory: { translation: "记忆；记忆力", byPart: { noun: "记忆；记忆力；回忆" } },
  rhythm: { translation: "节奏；韵律", byPart: { noun: "节奏；韵律；规律" } },
  meaning: { translation: "意义；含义", byPart: { noun: "意义；含义；意图", adjective: "意味深长的" } }
};

const partOfSpeechLabels = {
  noun: "名词",
  verb: "动词",
  adjective: "形容词",
  adverb: "副词",
  pronoun: "代词",
  preposition: "介词",
  conjunction: "连词",
  interjection: "感叹词",
  determiner: "限定词",
  numeral: "数词"
};

const targetLanguageLabels = {
  "zh-CN": "中文词义",
  ja: "日语词义",
  ko: "韩语词义",
  fr: "法语词义",
  es: "西班牙语词义"
};

let voices = [];
let currentUtterance = null;
let activeWord = null;
let lastLookupController = null;
let pdfModule = null;
const lookupCache = new Map();

function setStatus(text, speaking = false) {
  els.statusText.textContent = text;
  els.statusDot.classList.toggle("speaking", speaking);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function tokenizeParagraph(paragraph) {
  return paragraph
    .split(/([A-Za-z]+(?:['-][A-Za-z]+)?)/g)
    .map((part) => {
      if (/^[A-Za-z]+(?:['-][A-Za-z]+)?$/.test(part)) {
        const clean = part.toLowerCase();
        return `<span class="word" role="button" tabindex="0" data-word="${escapeHtml(clean)}">${escapeHtml(part)}</span>`;
      }
      return escapeHtml(part);
    })
    .join("");
}

function renderText(rawText) {
  const text = rawText.replace(/\r\n?/g, "\n").trim();

  if (!text) {
    els.reader.innerHTML = `<p class="reader-placeholder">阅读区暂无内容。上传文档或输入文本后，点击“载入阅读区”。</p>`;
    return;
  }

  const paragraphs = text
    .split(/\n{2,}/)
    .map((part) => part.replace(/\n/g, " ").trim())
    .filter(Boolean);

  els.reader.innerHTML = paragraphs
    .map((paragraph, index) => `
      <p class="paragraph" data-paragraph="${index}">
        <button class="paragraph-play" type="button" title="朗读本段" data-read-paragraph="${index}">▶</button>
        ${tokenizeParagraph(paragraph)}
      </p>
    `)
    .join("");

  setStatus(`已载入 ${paragraphs.length} 段`);
}

function getReadableText() {
  return Array.from(els.reader.querySelectorAll(".paragraph"))
    .map((paragraph) => paragraph.innerText.replace(/^▶\s*/, "").trim())
    .filter(Boolean)
    .join("\n\n");
}

function selectedVoice() {
  const selectedName = els.voiceSelect.value;
  return voices.find((voice) => voice.name === selectedName) || voices.find((voice) => voice.lang.startsWith("en"));
}

function speak(text, status = "朗读中") {
  const cleanText = text.replace(/\s+/g, " ").trim();
  if (!cleanText) {
    setStatus("没有可朗读内容");
    return;
  }

  window.speechSynthesis.cancel();
  currentUtterance = new SpeechSynthesisUtterance(cleanText);
  currentUtterance.lang = selectedVoice()?.lang || "en-US";
  currentUtterance.voice = selectedVoice() || null;
  currentUtterance.rate = Number(els.rateRange.value);
  currentUtterance.pitch = 1;
  currentUtterance.onstart = () => setStatus(status, true);
  currentUtterance.onend = () => setStatus("朗读完成");
  currentUtterance.onerror = () => setStatus("朗读被中断");
  window.speechSynthesis.speak(currentUtterance);
}

function loadVoices() {
  voices = window.speechSynthesis
    .getVoices()
    .filter((voice) => voice.lang.toLowerCase().startsWith("en"));

  if (!voices.length) {
    els.voiceSelect.innerHTML = `<option value="">English voice</option>`;
    return;
  }

  els.voiceSelect.innerHTML = voices
    .map((voice) => `<option value="${escapeHtml(voice.name)}">${escapeHtml(voice.name)} · ${escapeHtml(voice.lang)}</option>`)
    .join("");

  const preferred = voices.find((voice) => voice.lang === "en-US") || voices[0];
  els.voiceSelect.value = preferred.name;
}

function updateSelectionBar() {
  const selection = document.getSelection();
  const text = selection?.toString().replace(/\s+/g, " ").trim() || "";
  const inReader = selection?.rangeCount
    ? els.reader.contains(selection.getRangeAt(0).commonAncestorContainer)
    : false;

  if (text && inReader) {
    els.selectionPreview.textContent = text.length > 120 ? `${text.slice(0, 120)}...` : text;
    els.selectionBar.hidden = false;
  } else {
    els.selectionBar.hidden = true;
  }
}

function showCardAt(event) {
  const cardWidth = Math.min(360, window.innerWidth - 32);
  const left = Math.min(event.clientX + 12, window.innerWidth - cardWidth - 16);
  const top = Math.min(event.clientY + 12, window.innerHeight - 220);
  els.wordCard.style.left = `${Math.max(16, left)}px`;
  els.wordCard.style.top = `${Math.max(16, top)}px`;
  els.wordCard.style.right = "auto";
  els.wordCard.style.bottom = "auto";
  els.wordCard.hidden = false;
}

function resetCard(word) {
  els.cardWord.textContent = word;
  els.wordLanguage.textContent = "English word";
  els.phoneticText.textContent = "查询中...";
  els.speakWordButton.dataset.audio = "";
  els.definitionList.innerHTML = `<div class="definition-item"><span class="pos-badge">查询</span><p>正在核对词性、词义和发音。</p></div>`;
  els.translationLabel.textContent = targetLanguageLabels[els.targetLang.value] || "目标语言词义";
  els.translationSummary.textContent = "查询中...";
  els.confidenceText.textContent = "正在筛选高可信翻译结果";
}

async function lookupDictionary(word, signal) {
  const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`, { signal });
  if (!response.ok) {
    throw new Error("Dictionary lookup failed");
  }
  const [entry] = await response.json();
  const phonetic = entry.phonetic || entry.phonetics?.find((item) => item.text)?.text || "";
  const audio = entry.phonetics?.find((item) => item.audio)?.audio || "";
  const meaningMap = new Map();
  for (const meaning of entry.meanings || []) {
    const partOfSpeech = meaning.partOfSpeech || "meaning";
    const current = meaningMap.get(partOfSpeech) || [];
    const nextDefinitions = (meaning.definitions || [])
      .map((definition) => ({
        definition: definition.definition,
        example: definition.example
      }))
      .filter((definition) => definition.definition);
    meaningMap.set(partOfSpeech, current.concat(nextDefinitions).slice(0, 4));
  }

  const meanings = Array.from(meaningMap, ([partOfSpeech, definitions]) => ({
    partOfSpeech,
    definitions
  }))
    .filter((meaning) => meaning.definitions.length)
    .slice(0, 5);

  return { phonetic, audio, meanings };
}

function getFallbackEntry(word) {
  for (const candidate of getWordCandidates(word)) {
    if (fallbackDictionary[candidate]) {
      return fallbackDictionary[candidate];
    }
  }
  return null;
}

function getFallbackTranslation(word) {
  return getFallbackEntry(word)?.translation || "";
}

function getWordCandidates(word) {
  const lower = word.toLowerCase();
  const candidates = [lower];

  if (lower.endsWith("ies") && lower.length > 4) {
    candidates.push(`${lower.slice(0, -3)}y`);
  }
  if (lower.endsWith("ing") && lower.length > 5) {
    candidates.push(lower.slice(0, -3));
    candidates.push(`${lower.slice(0, -3)}e`);
  }
  if (lower.endsWith("ed") && lower.length > 4) {
    candidates.push(lower.slice(0, -2));
    candidates.push(`${lower.slice(0, -1)}`);
  }
  if (lower.endsWith("es") && lower.length > 4) {
    candidates.push(lower.slice(0, -1));
    candidates.push(lower.slice(0, -2));
  }
  if (lower.endsWith("s") && lower.length > 3) {
    candidates.push(lower.slice(0, -1));
  }

  return Array.from(new Set(candidates));
}

function decodeEntities(value) {
  const textarea = document.createElement("textarea");
  textarea.innerHTML = value;
  return textarea.value;
}

function hasTargetScript(value, target) {
  if (target === "zh-CN") {
    return /[\u3400-\u9fff]/.test(value);
  }
  return Boolean(value.trim());
}

function cleanTranslation(value, word, target) {
  const cleaned = decodeEntities(String(value || ""))
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .replace(/\b(MyMemory|translated by|warning)\b.*$/i, "")
    .trim();

  if (!cleaned || cleaned.toLowerCase() === word.toLowerCase()) {
    return "";
  }

  if (!hasTargetScript(cleaned, target)) {
    return "";
  }

  if (cleaned.length > 48 && target === "zh-CN") {
    return "";
  }

  return cleaned
    .split(/[;,，；/]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 4)
    .join("；");
}

function scoreTranslationMatch(match, word, target) {
  const translation = cleanTranslation(match.translation, word, target);
  if (!translation) {
    return null;
  }

  const segment = String(match.segment || "").trim().toLowerCase();
  const exact = segment === word.toLowerCase();
  const quality = Number(match.match || 0);
  const score = (exact ? 2 : 0) + quality + (translation.length <= 18 ? 0.3 : 0);

  return { text: translation, score, exact, quality };
}

async function lookupTranslation(word, signal) {
  const target = els.targetLang.value;
  const fallback = getFallbackTranslation(word);

  if (target === "zh-CN" && fallback) {
    return {
      text: fallback,
      confidence: "高可信：来自内置常见词表，并结合英文词典释义展示。",
      source: "local"
    };
  }

  const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=en|${encodeURIComponent(target)}`, { signal });
  if (!response.ok) {
    throw new Error("Translation lookup failed");
  }
  const data = await response.json();
  const candidates = [
    scoreTranslationMatch({ translation: data?.responseData?.translatedText, segment: word, match: data?.responseData?.match }, word, target),
    ...(data?.matches || []).map((match) => scoreTranslationMatch(match, word, target))
  ].filter(Boolean);
  const unique = Array.from(new Map(candidates.map((item) => [item.text, item])).values())
    .sort((a, b) => b.score - a.score);
  const best = unique[0];

  if (best && (best.exact || best.quality >= 0.85)) {
    return {
      text: best.text,
      confidence: best.exact ? "较高可信：在线翻译结果与原词精确匹配。" : "中等可信：已过滤低质量结果，请结合英文释义判断。",
      source: "online"
    };
  }

  return {
    text: fallback || "暂无高可信翻译",
    confidence: fallback ? "中等可信：来自本地兜底词表。" : "未找到可靠翻译，建议参考英文释义和上下文。",
    source: fallback ? "fallback" : "none"
  };
}

function renderDefinitions(result, word, translation) {
  els.phoneticText.textContent = result.phonetic || "暂无音标";
  els.speakWordButton.dataset.audio = result.audio || "";
  els.translationSummary.textContent = translation.text;
  els.confidenceText.textContent = translation.confidence;

  if (!result.meanings.length) {
    els.definitionList.innerHTML = `<div class="definition-item"><span class="pos-badge">词义</span><p>${escapeHtml(getFallbackTranslation(word) || "暂无英文释义")}</p></div>`;
    return;
  }

  const fallbackEntry = getFallbackEntry(word);
  els.definitionList.innerHTML = result.meanings
    .map((meaning) => {
      const posLabel = partOfSpeechLabels[meaning.partOfSpeech] || meaning.partOfSpeech;
      const localMeaning = fallbackEntry?.byPart?.[meaning.partOfSpeech] || "";
      return `
      <div class="definition-item">
        <div class="definition-heading">
          <span class="pos-badge">${escapeHtml(posLabel)}</span>
          <span class="pos-name">${escapeHtml(meaning.partOfSpeech)}</span>
        </div>
        ${localMeaning ? `<p class="local-meaning">${escapeHtml(localMeaning)}</p>` : ""}
        <ol>
          ${meaning.definitions.map((item) => `
            <li>
              <p>${escapeHtml(item.definition)}</p>
              ${item.example ? `<em>${escapeHtml(item.example)}</em>` : ""}
            </li>
          `).join("")}
        </ol>
      </div>
    `;
    })
    .join("");
}

async function openWordCard(word, event) {
  if (!word) {
    return;
  }

  lastLookupController?.abort();
  lastLookupController = new AbortController();
  resetCard(word);
  showCardAt(event);

  try {
    const cacheKey = `${word}:${els.targetLang.value}`;
    const result = lookupCache.get(cacheKey) || await Promise.allSettled([
      lookupDictionary(word, lastLookupController.signal),
      lookupTranslation(word, lastLookupController.signal)
    ]);
    lookupCache.set(cacheKey, result);
    const [dictionary, translation] = result;

    const translationResult = translation.status === "fulfilled"
      ? translation.value
      : {
        text: getFallbackTranslation(word) || "翻译服务暂不可用",
        confidence: getFallbackTranslation(word) ? "中等可信：来自本地兜底词表。" : "在线翻译不可用，请参考英文释义。",
        source: "fallback"
      };

    if (dictionary.status === "fulfilled") {
      renderDefinitions(dictionary.value, word, translationResult);
    } else {
      els.phoneticText.textContent = "暂无音标";
      els.translationSummary.textContent = translationResult.text;
      els.confidenceText.textContent = translationResult.confidence;
      els.definitionList.innerHTML = `<div class="definition-item"><span class="pos-badge">兜底</span><p>${escapeHtml(getFallbackTranslation(word) || "在线字典暂不可用，可点击发音继续练习。")}</p></div>`;
    }
  } catch {
    els.translationSummary.textContent = getFallbackTranslation(word) || "查询已取消";
    els.confidenceText.textContent = "本次查询被取消或网络暂不可用。";
  }
}

function normalizeLoadedText(htmlOrText, type) {
  if (type.includes("html")) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlOrText, "text/html");
    return doc.body.innerText;
  }
  return htmlOrText;
}

async function readPdf(file) {
  pdfModule ||= await import("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs");
  const pdfjs = pdfModule;
  if (!pdfjs) {
    throw new Error("PDF 解析库尚未加载，请稍后再试或检查网络。");
  }
  pdfjs.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs";
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buffer }).promise;
  const pages = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => item.str).join(" "));
  }

  return pages.join("\n\n");
}

async function readDocx(file) {
  if (!globalThis.mammoth) {
    throw new Error("DOCX 解析库尚未加载，请稍后再试或检查网络。");
  }
  const buffer = await file.arrayBuffer();
  const result = await globalThis.mammoth.extractRawText({ arrayBuffer: buffer });
  return result.value;
}

async function readFile(file) {
  const name = file.name.toLowerCase();
  setStatus(`正在读取 ${file.name}`);

  if (name.endsWith(".pdf")) {
    return readPdf(file);
  }

  if (name.endsWith(".docx") || name.endsWith(".doc")) {
    return readDocx(file);
  }

  const text = await file.text();
  return normalizeLoadedText(text, file.type);
}

function bindEvents() {
  els.renderButton.addEventListener("click", () => renderText(els.textInput.value));
  els.sampleButton.addEventListener("click", () => {
    els.textInput.value = sampleText;
    renderText(sampleText);
  });
  els.clearButton.addEventListener("click", () => {
    window.speechSynthesis.cancel();
    els.textInput.value = "";
    renderText("");
    setStatus("已清空");
  });

  els.fileInput.addEventListener("change", async (event) => {
    const [file] = event.target.files || [];
    if (!file) {
      return;
    }
    try {
      const text = await readFile(file);
      els.textInput.value = text;
      renderText(text);
    } catch (error) {
      setStatus(error.message || "读取失败");
    }
  });

  ["dragenter", "dragover"].forEach((type) => {
    els.dropZone.addEventListener(type, (event) => {
      event.preventDefault();
      els.dropZone.classList.add("dragging");
    });
  });

  ["dragleave", "drop"].forEach((type) => {
    els.dropZone.addEventListener(type, () => els.dropZone.classList.remove("dragging"));
  });

  els.dropZone.addEventListener("drop", async (event) => {
    event.preventDefault();
    const [file] = event.dataTransfer.files || [];
    if (!file) {
      return;
    }
    try {
      const text = await readFile(file);
      els.textInput.value = text;
      renderText(text);
    } catch (error) {
      setStatus(error.message || "读取失败");
    }
  });

  els.reader.addEventListener("click", (event) => {
    const paragraphButton = event.target.closest("[data-read-paragraph]");
    if (paragraphButton) {
      const paragraph = paragraphButton.closest(".paragraph");
      speak(paragraph.innerText.replace(/^▶\s*/, ""), "朗读段落");
      return;
    }

    const wordEl = event.target.closest(".word");
    if (!wordEl) {
      return;
    }
    activeWord?.classList.remove("active");
    activeWord = wordEl;
    activeWord.classList.add("active");
    openWordCard(wordEl.dataset.word, event);
  });

  els.reader.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }
    const wordEl = event.target.closest(".word");
    if (wordEl) {
      event.preventDefault();
      openWordCard(wordEl.dataset.word, event);
    }
  });

  document.addEventListener("selectionchange", updateSelectionBar);
  els.reader.addEventListener("mouseup", updateSelectionBar);
  els.reader.addEventListener("keyup", updateSelectionBar);

  els.readSelectionButton.addEventListener("click", () => {
    const text = document.getSelection()?.toString() || "";
    speak(text, "朗读选中");
  });

  els.readAllButton.addEventListener("click", () => speak(getReadableText(), "朗读全文"));
  els.pauseButton.addEventListener("click", () => {
    if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
      window.speechSynthesis.pause();
      setStatus("已暂停");
    } else {
      window.speechSynthesis.resume();
      setStatus("继续朗读", true);
    }
  });
  els.stopButton.addEventListener("click", () => {
    window.speechSynthesis.cancel();
    setStatus("已停止");
  });

  els.rateRange.addEventListener("input", () => {
    els.rateValue.textContent = Number(els.rateRange.value).toFixed(1);
  });

  els.closeCardButton.addEventListener("click", () => {
    els.wordCard.hidden = true;
    activeWord?.classList.remove("active");
  });

  els.speakWordButton.addEventListener("click", () => {
    const audioUrl = els.speakWordButton.dataset.audio;
    if (audioUrl) {
      new Audio(audioUrl).play();
      return;
    }
    speak(els.cardWord.textContent, "朗读单词");
  });
}

bindEvents();
loadVoices();
window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
renderText(els.textInput.value);
